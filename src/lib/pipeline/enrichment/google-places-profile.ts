import { recordPipelineUsage } from "@/lib/pipeline/billing/pipeline-usage";

// Resolves the client's own Google Business Profile from their website URL
// (or offer text). Uses Places API (New) at places.googleapis.com/v1 — the
// legacy maps.googleapis.com endpoints were retired for new projects in
// 2024. Returns whatever was extractable; caller treats the result as
// best-effort and continues even when nothing is found.
//
// No `server-only` guard: the import chain reaches client bundles via
// IcpForm; the runtime work (fetch) is still effectively server-side.

export interface ClientBusinessProfile {
  name?: string;
  primaryCategory?: string;
  city?: string;
  region?: string;
  country?: string;
  ratingsCount?: number;
}

const SEARCH_TEXT_URL = "https://places.googleapis.com/v1/places:searchText";

// Tight field mask — keeps the lookup at Pro tier and avoids paying for
// fields we don't read (phone, website, opening hours, etc.).
const PROFILE_FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.types",
  "places.userRatingCount",
  "places.addressComponents",
].join(",");

interface PlacesV1AddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface PlacesV1Place {
  id?: string;
  displayName?: { text?: string; languageCode?: string };
  types?: string[];
  userRatingCount?: number;
  addressComponents?: PlacesV1AddressComponent[];
}

interface PlacesV1SearchTextResponse {
  places?: PlacesV1Place[];
  error?: { code?: number; message?: string; status?: string };
}

function findComponent(
  components: PlacesV1AddressComponent[] | undefined,
  type: string,
): string | undefined {
  if (!components) return undefined;
  const hit = components.find((c) =>
    Array.isArray(c.types) ? c.types.includes(type) : false,
  );
  return hit?.longText;
}

export async function lookupClientBusinessProfile(args: {
  clientId: string | number;
  websiteUrl: string;
  offer: string;
}): Promise<ClientBusinessProfile> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return {};

  // Build a text query that is biased toward finding the SPECIFIC business
  // rather than a generic category. The website URL is the strongest signal
  // (Google can usually resolve it to a place_id). Fall back to the offer
  // text if no URL.
  const textQuery = (args.websiteUrl || args.offer || "").trim();
  if (!textQuery) return {};

  let response: Response;
  try {
    response = await fetch(SEARCH_TEXT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": PROFILE_FIELD_MASK,
      },
      body: JSON.stringify({
        textQuery,
        regionCode: "ZA",
        languageCode: "en",
        pageSize: 1,
      }),
    });
  } catch {
    return {};
  }

  if (!response.ok) {
    // Soft-fail: log and return empty so the synthesis still runs.
    const body = await response.text().catch(() => "");
    console.warn(
      `[gbp-profile] searchText HTTP ${response.status}: ${body.slice(0, 200)}`,
    );
    return {};
  }

  let data: PlacesV1SearchTextResponse;
  try {
    data = (await response.json()) as PlacesV1SearchTextResponse;
  } catch {
    return {};
  }

  if (data.error) {
    console.warn(
      `[gbp-profile] API error: ${data.error.message ?? "no message"}`,
    );
    return {};
  }

  // Tag the call once. The new API combines find_place + place_details into
  // a single searchText call, so we record it under that endpoint label.
  await recordPipelineUsage({
    clientId: args.clientId,
    provider: "google_places",
    endpoint: "text_search",
  });

  const place = data.places?.[0];
  if (!place) return {};

  return {
    name: place.displayName?.text,
    primaryCategory: place.types?.[0],
    city: findComponent(place.addressComponents, "locality"),
    region: findComponent(place.addressComponents, "administrative_area_level_1"),
    country: findComponent(place.addressComponents, "country"),
    ratingsCount:
      typeof place.userRatingCount === "number" ? place.userRatingCount : undefined,
  };
}
