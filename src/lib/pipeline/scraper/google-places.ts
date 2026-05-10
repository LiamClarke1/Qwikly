// Live Google Places scraper for the Qwikly Pipeline lead engine. Replaces
// the previous mocked deterministic generator with real SA business data
// pulled from the Places web service (Text Search + Place Details).
//
// Each prospect costs roughly USD 0.034 (Text Search + Place Details). Cap is
// hardcoded at 100 prospects per run.
//
// Notes:
// - Uses native fetch, no new dependencies.
// - Reads process.env.GOOGLE_PLACES_API_KEY. When missing, returns [] and
//   logs a warning so callers degrade gracefully instead of throwing.
// - Region biased to South Africa, English language.

import type {
  PlaceResult,
  PlaceSearchInput,
  PlacesDetailsResponse,
  PlacesTextSearchResponse,
} from "./google-places.types";

const PROSPECT_HARD_CAP = 100;
const MAX_QUERIES_PER_RUN = 10;

const TEXT_SEARCH_URL =
  "https://maps.googleapis.com/maps/api/place/textsearch/json";
const PLACE_DETAILS_URL =
  "https://maps.googleapis.com/maps/api/place/details/json";

const PLACE_DETAILS_FIELDS = [
  "name",
  "formatted_address",
  "formatted_phone_number",
  "website",
  "types",
  "rating",
  "user_ratings_total",
  "business_status",
  "geometry",
  "opening_hours",
].join(",");

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

async function runTextSearch(
  industry: string,
  location: string,
  apiKey: string,
): Promise<{ status: "ok"; placeIds: string[] } | { status: "quota" } | { status: "skip" }> {
  const query = `${industryToQueryTerm(industry)} ${locationToQuerySuffix(location)}`;
  const params = new URLSearchParams({
    query,
    region: "za",
    language: "en",
    key: apiKey,
  });

  let response: Response;
  try {
    response = await fetch(`${TEXT_SEARCH_URL}?${params.toString()}`);
  } catch (err) {
    console.warn(
      `[google-places] text search network error for "${query}", skipping`,
      err,
    );
    return { status: "skip" };
  }

  if (!response.ok) {
    console.warn(
      `[google-places] text search HTTP ${response.status} for "${query}", skipping`,
    );
    return { status: "skip" };
  }

  const data = (await response.json()) as PlacesTextSearchResponse;

  if (data.status === "OVER_QUERY_LIMIT") {
    console.warn(
      `[google-places] OVER_QUERY_LIMIT on text search for "${query}", returning what we have`,
    );
    return { status: "quota" };
  }
  if (data.status === "REQUEST_DENIED") {
    console.error(
      `[google-places] REQUEST_DENIED on text search for "${query}": ${data.error_message ?? "no message"}`,
    );
    return { status: "skip" };
  }
  if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
    console.warn(
      `[google-places] unexpected status "${data.status}" on text search for "${query}"`,
    );
    return { status: "skip" };
  }

  const placeIds: string[] = [];
  for (const r of data.results ?? []) {
    if (typeof r.place_id === "string" && r.place_id.length > 0) {
      placeIds.push(r.place_id);
    }
  }
  return { status: "ok", placeIds };
}

async function fetchPlaceDetails(
  placeId: string,
  apiKey: string,
): Promise<
  | { status: "ok"; result: PlaceResult }
  | { status: "quota" }
  | { status: "skip" }
> {
  const params = new URLSearchParams({
    place_id: placeId,
    fields: PLACE_DETAILS_FIELDS,
    language: "en",
    region: "za",
    key: apiKey,
  });

  let response: Response;
  try {
    response = await fetch(`${PLACE_DETAILS_URL}?${params.toString()}`);
  } catch (err) {
    console.warn(
      `[google-places] details network error for place_id=${placeId}, skipping`,
      err,
    );
    return { status: "skip" };
  }

  if (!response.ok) {
    console.warn(
      `[google-places] details HTTP ${response.status} for place_id=${placeId}, skipping`,
    );
    return { status: "skip" };
  }

  const data = (await response.json()) as PlacesDetailsResponse;

  if (data.status === "OVER_QUERY_LIMIT") {
    console.warn(
      `[google-places] OVER_QUERY_LIMIT on details for place_id=${placeId}, returning what we have`,
    );
    return { status: "quota" };
  }
  if (data.status === "REQUEST_DENIED") {
    console.error(
      `[google-places] REQUEST_DENIED on details for place_id=${placeId}: ${data.error_message ?? "no message"}`,
    );
    return { status: "skip" };
  }
  if (data.status !== "OK") {
    console.warn(
      `[google-places] unexpected status "${data.status}" on details for place_id=${placeId}`,
    );
    return { status: "skip" };
  }

  const r = data.result;
  if (!r) {
    return { status: "skip" };
  }

  const lat = r.geometry?.location?.lat;
  const lng = r.geometry?.location?.lng;
  if (
    typeof r.name !== "string" ||
    typeof r.formatted_address !== "string" ||
    typeof lat !== "number" ||
    typeof lng !== "number"
  ) {
    return { status: "skip" };
  }

  const result: PlaceResult = {
    place_id: placeId,
    name: r.name,
    formatted_address: r.formatted_address,
    formatted_phone_number: r.formatted_phone_number,
    website: r.website,
    types: Array.isArray(r.types) ? r.types : [],
    rating: typeof r.rating === "number" ? r.rating : undefined,
    user_ratings_total:
      typeof r.user_ratings_total === "number" ? r.user_ratings_total : undefined,
    business_status:
      typeof r.business_status === "string" ? r.business_status : "OPERATIONAL",
    geometry: { location: { lat, lng } },
    opening_hours: r.opening_hours
      ? {
          open_now: r.opening_hours.open_now,
          weekday_text: r.opening_hours.weekday_text,
        }
      : undefined,
  };
  return { status: "ok", result };
}

export async function searchBusinesses(
  input: PlaceSearchInput,
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

  const seenPlaceIds = new Set<string>();
  const orderedPlaceIds: string[] = [];

  let quotaHit = false;
  for (const combo of combos) {
    const searchOutcome = await runTextSearch(
      combo.industry,
      combo.location,
      apiKey,
    );
    if (searchOutcome.status === "quota") {
      quotaHit = true;
      break;
    }
    if (searchOutcome.status === "skip") {
      continue;
    }
    for (const placeId of searchOutcome.placeIds) {
      if (!seenPlaceIds.has(placeId)) {
        seenPlaceIds.add(placeId);
        orderedPlaceIds.push(placeId);
      }
      if (orderedPlaceIds.length >= targetQuantity) {
        break;
      }
    }
    if (orderedPlaceIds.length >= targetQuantity) {
      break;
    }
  }

  if (orderedPlaceIds.length === 0) {
    return [];
  }

  const results: PlaceResult[] = [];
  const idsToEnrich = orderedPlaceIds.slice(0, targetQuantity);
  for (const placeId of idsToEnrich) {
    if (quotaHit) {
      break;
    }
    const detailsOutcome = await fetchPlaceDetails(placeId, apiKey);
    if (detailsOutcome.status === "quota") {
      quotaHit = true;
      break;
    }
    if (detailsOutcome.status === "skip") {
      continue;
    }
    results.push(detailsOutcome.result);
    if (results.length >= targetQuantity) {
      break;
    }
  }

  return results.slice(0, targetQuantity);
}
