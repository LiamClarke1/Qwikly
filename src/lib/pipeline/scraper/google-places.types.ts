// Typed shapes for the Google Places scraper. Keep this file pure (no runtime
// side effects) so it is safe to import from both server actions and any
// internal tooling that needs to reason about Places data without making
// network calls.

export interface PlaceLocation {
  lat: number;
  lng: number;
}

export interface PlaceGeometry {
  location: PlaceLocation;
}

export interface PlaceOpeningHours {
  open_now?: boolean;
  weekday_text?: string[];
}

export interface PlaceResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  website?: string;
  types: string[];
  rating?: number;
  user_ratings_total?: number;
  business_status: string;
  geometry: PlaceGeometry;
  opening_hours?: PlaceOpeningHours;
}

export interface PlaceSearchInput {
  // Labels straight from the IcpDefinition form, for example
  // ["Property Management", "Body Corporate"].
  industries: string[];
  // SA locations from the IcpDefinition form, for example
  // ["Cape Town", "Stellenbosch", "Anywhere in SA"].
  locations: string[];
  // Hard upper bound on returned prospects. Capped at 100 in the scraper to
  // stay inside the API budget.
  quantity: number;
}

// Raw shapes returned by the Google Places web service. We model the subset
// we actually read so the scraper can stay strictly typed without leaking
// "any" into the rest of the codebase.

export interface PlacesTextSearchResponse {
  status: string;
  error_message?: string;
  results?: Array<{
    place_id?: string;
    name?: string;
    formatted_address?: string;
    types?: string[];
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
    geometry?: {
      location?: { lat?: number; lng?: number };
    };
  }>;
}

export interface PlacesDetailsResponse {
  status: string;
  error_message?: string;
  result?: {
    place_id?: string;
    name?: string;
    formatted_address?: string;
    formatted_phone_number?: string;
    website?: string;
    types?: string[];
    rating?: number;
    user_ratings_total?: number;
    business_status?: string;
    geometry?: {
      location?: { lat?: number; lng?: number };
    };
    opening_hours?: {
      open_now?: boolean;
      weekday_text?: string[];
    };
  };
}
