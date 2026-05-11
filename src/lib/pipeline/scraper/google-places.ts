// Live Google Places scraper for the Qwikly Pipeline lead engine. Calls the
// Places API (New) at places.googleapis.com/v1, replacing the legacy
// maps.googleapis.com/maps/api/place/... endpoints which Google retired for
// new projects in 2024.
//
// Key differences vs the legacy API:
//   - One endpoint (searchText) returns name + address + phone + website +
//     types + rating + reviews + business status in a single call, so we no
//     longer need a separate place_details round trip per prospect.
//   - Auth is via X-Goog-Api-Key header (not ?key= query param).
//   - Field selection is via X-Goog-FieldMask header. Google bills based on
//     the fields requested — we ask for Pro-tier fields (~$32/1000).
//
// Each prospect costs roughly USD 0.032. Cap is hardcoded at 100 prospects
// per run.
//
// Reads process.env.GOOGLE_PLACES_API_KEY. When missing, returns [] and logs
// a warning so callers degrade gracefully instead of throwing.

import { recordPipelineUsage } from "@/lib/pipeline/billing/pipeline-usage";

import type { PlaceResult, PlaceSearchInput } from "./google-places.types";

const PROSPECT_HARD_CAP = 100;
const MAX_QUERIES_PER_RUN = 10;

const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";

// Fields the downstream generator + scoring need. Anything not listed here
// is NOT returned by the API. Adding fields here MAY raise the per-call
// price tier — keep it tight.
const SEARCH_TEXT_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.types",
  "places.rating",
  "places.userRatingCount",
  "places.businessStatus",
  "places.location",
  "places.websiteUri",
  "places.nationalPhoneNumber",
].join(",");

// Raw shape of a single place in the Places API (New) response body. Modelled
// only as far as we actually consume it.
interface PlacesV1Place {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  formattedAddress?: string;
  types?: string[];
  rating?: number;
  userRatingCount?: number;
  businessStatus?: string;
  location?: { latitude?: number; longitude?: number };
  websiteUri?: string;
  nationalPhoneNumber?: string;
}

interface PlacesV1SearchTextResponse {
  places?: PlacesV1Place[];
  error?: { code?: number; message?: string; status?: string };
}

// Maps IcpDefinition industry labels to natural Google Places search terms.
// If an industry label is not in this table, the scraper falls back to the
// label itself.
const INDUSTRY_QUERY_MAP: Record<string, string> = {
  Construction: "construction company",
  "Professional Services": "consulting firm",
  SaaS: "software company",
  Healthcare: "medical practice",
  Education: "private school",
  "Financial Services": "financial services firm",
  Marketing: "marketing agency",
  Manufacturing: "manufacturing company",
  Retail: "retail store",
  Hospitality: "hotel",
  "Property Management": "property management company",
  "Body Corporate": "body corporate management",
};

function industryToQueryTerm(industry: string): string {
  return INDUSTRY_QUERY_MAP[industry] ?? industry;
}

function locationToQuerySuffix(location: string): string {
  // "Anywhere in SA" is a UI convenience, not a real place. Bias the search
  // to South Africa as a whole instead of injecting that phrase verbatim.
  if (location === "Anywhere in SA") {
    return "South Africa";
  }
  return `${location} South Africa`;
}

interface QueryCombo {
  industry: string;
  location: string;
}

// When the cartesian product of industries x locations exceeds the budget
// cap, pick the most likely combinations: prioritise earlier industries
// paired with earlier locations (the form orders these by relevance).
function pickQueryCombos(
  industries: string[],
  locations: string[],
  maxQueries: number,
): QueryCombo[] {
  const combos: QueryCombo[] = [];
  for (const industry of industries) {
    for (const location of locations) {
      combos.push({ industry, location });
    }
  }
  if (combos.length <= maxQueries) {
    return combos;
  }
  return combos.slice(0, maxQueries);
}

// Map a Places API (New) response object onto the internal PlaceResult shape
// the rest of the codebase still consumes. Returns null when required fields
// are missing.
function mapPlaceV1ToResult(p: PlacesV1Place): PlaceResult | null {
  const id = p.id;
  const name = p.displayName?.text;
  const formattedAddress = p.formattedAddress;
  const lat = p.location?.latitude;
  const lng = p.location?.longitude;

  if (
    typeof id !== "string" ||
    id.length === 0 ||
    typeof name !== "string" ||
    name.length === 0 ||
    typeof formattedAddress !== "string"
  ) {
    return null;
  }

  return {
    place_id: id,
    name,
    formatted_address: formattedAddress,
    formatted_phone_number: p.nationalPhoneNumber,
    website: p.websiteUri,
    types: Array.isArray(p.types) ? p.types : [],
    rating: typeof p.rating === "number" ? p.rating : undefined,
    user_ratings_total:
      typeof p.userRatingCount === "number" ? p.userRatingCount : undefined,
    business_status:
      typeof p.businessStatus === "string" ? p.businessStatus : "OPERATIONAL",
    geometry: {
      location: {
        lat: typeof lat === "number" ? lat : 0,
        lng: typeof lng === "number" ? lng : 0,
      },
    },
  };
}

async function runTextSearch(
  industry: string,
  location: string,
  apiKey: string,
  clientId: string | number,
  pageSize: number,
): Promise<
  { status: "ok"; places: PlaceResult[] } | { status: "quota" } | { status: "skip" }
> {
  const textQuery = `${industryToQueryTerm(industry)} ${locationToQuerySuffix(location)}`;

  let response: Response;
  try {
    response = await fetch(SEARCH_TEXT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": SEARCH_TEXT_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        regionCode: "ZA",
        languageCode: "en",
        pageSize: Math.min(Math.max(1, pageSize), 20),
      }),
    });
  } catch (err) {
    console.warn(
      `[google-places] searchText network error for "${textQuery}", skipping`,
      err,
    );
    return { status: "skip" };
  }

  if (response.status === 429) {
    console.warn(
      `[google-places] 429 quota hit on searchText for "${textQuery}"`,
    );
    return { status: "quota" };
  }
  if (response.status === 403) {
    const body = await response.text().catch(() => "");
    console.error(
      `[google-places] 403 REQUEST_DENIED on searchText for "${textQuery}": ${body.slice(0, 200)}`,
    );
    return { status: "skip" };
  }
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    console.warn(
      `[google-places] HTTP ${response.status} on searchText for "${textQuery}": ${body.slice(0, 200)}`,
    );
    return { status: "skip" };
  }

  const data = (await response.json()) as PlacesV1SearchTextResponse;

  if (data.error) {
    console.error(
      `[google-places] API error on searchText for "${textQuery}": ${data.error.message ?? "no message"}`,
    );
    return { status: "skip" };
  }

  // Tag the successful call against the tenant for cost tracking.
  void recordPipelineUsage({
    clientId,
    provider: "google_places",
    endpoint: "text_search",
  });

  const places: PlaceResult[] = [];
  for (const p of data.places ?? []) {
    const mapped = mapPlaceV1ToResult(p);
    if (mapped) places.push(mapped);
  }
  return { status: "ok", places };
}

export async function searchBusinesses(
  input: PlaceSearchInput,
  clientId: string | number,
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn(
      "[google-places] GOOGLE_PLACES_API_KEY not set, returning empty result",
    );
    return [];
  }

  const targetQuantity = Math.min(
    Math.max(0, input.quantity),
    PROSPECT_HARD_CAP,
  );
  if (targetQuantity === 0) {
    return [];
  }
  if (input.industries.length === 0 || input.locations.length === 0) {
    return [];
  }

  const combos = pickQueryCombos(
    input.industries,
    input.locations,
    MAX_QUERIES_PER_RUN,
  );

  // Each searchText call now returns up to 20 places with all the fields
  // we need. Spread the target across combos: ceil(target / combos) per call.
  const pageSize = Math.min(
    20,
    Math.max(1, Math.ceil(targetQuantity / Math.max(1, combos.length))),
  );

  const seenPlaceIds = new Set<string>();
  const results: PlaceResult[] = [];

  for (const combo of combos) {
    if (results.length >= targetQuantity) break;
    const outcome = await runTextSearch(
      combo.industry,
      combo.location,
      apiKey,
      clientId,
      pageSize,
    );
    if (outcome.status === "quota") break;
    if (outcome.status === "skip") continue;
    for (const place of outcome.places) {
      if (seenPlaceIds.has(place.place_id)) continue;
      seenPlaceIds.add(place.place_id);
      results.push(place);
      if (results.length >= targetQuantity) break;
    }
  }

  return results.slice(0, targetQuantity);
}
