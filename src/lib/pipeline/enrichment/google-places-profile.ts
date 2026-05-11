import "server-only";
import { recordPipelineUsage } from "@/lib/pipeline/billing/pipeline-usage";

export interface ClientBusinessProfile {
  name?: string;
  primaryCategory?: string;
  city?: string;
  region?: string;
  country?: string;
  ratingsCount?: number;
}

interface FindPlaceResp {
  candidates?: Array<{ place_id?: string; name?: string }>;
  status?: string;
}

interface PlaceDetailsResp {
  result?: {
    name?: string;
    types?: string[];
    address_components?: Array<{ long_name: string; short_name: string; types: string[] }>;
    user_ratings_total?: number;
  };
  status?: string;
}

/**
 * Resolve the client's own Google Business Profile from their website URL
 * (or, failing that, their offer text). Returns whatever was extractable;
 * caller treats the result as best-effort.
 */
export async function lookupClientBusinessProfile(args: {
  clientId: string | number;
  websiteUrl: string;
  offer: string;
}): Promise<ClientBusinessProfile> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return {};

  const query = encodeURIComponent(args.websiteUrl || args.offer);
  const findUrl =
    `https://maps.googleapis.com/maps/api/place/findplacefromtext/json` +
    `?input=${query}&inputtype=textquery&fields=place_id,name&key=${apiKey}`;

  let placeId: string | undefined;
  try {
    const res = await fetch(findUrl);
    const body = (await res.json()) as FindPlaceResp;
    await recordPipelineUsage({
      clientId: args.clientId,
      provider: "google_places",
      endpoint: "find_place",
    });
    placeId = body.candidates?.[0]?.place_id;
  } catch {
    return {};
  }
  if (!placeId) return {};

  const detailsUrl =
    `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}` +
    `&fields=name,types,address_components,user_ratings_total&key=${apiKey}`;

  try {
    const res = await fetch(detailsUrl);
    const body = (await res.json()) as PlaceDetailsResp;
    await recordPipelineUsage({
      clientId: args.clientId,
      provider: "google_places",
      endpoint: "place_details",
    });
    const r = body.result;
    if (!r) return {};

    const city = r.address_components?.find((c) => c.types.includes("locality"))?.long_name;
    const region = r.address_components?.find((c) =>
      c.types.includes("administrative_area_level_1"),
    )?.long_name;
    const country = r.address_components?.find((c) => c.types.includes("country"))?.long_name;

    return {
      name: r.name,
      primaryCategory: r.types?.[0],
      city,
      region,
      country,
      ratingsCount: r.user_ratings_total,
    };
  } catch {
    return {};
  }
}
