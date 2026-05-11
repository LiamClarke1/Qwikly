import { describe, it, expect } from "vitest";
import { computePipelineCallCost } from "../pipeline-usage";

describe("computePipelineCallCost", () => {
  it("prices a Google Places text search at the published rate", () => {
    const r = computePipelineCallCost({ provider: "google_places", endpoint: "text_search", units: 1 });
    // $32/1000 = $0.032/req. R18.5 * 0.032 * 100 = 59.2 -> ceil 60 cents
    expect(r.wholesaleCents).toBe(60);
  });

  it("prices a Google Places place_details call", () => {
    const r = computePipelineCallCost({ provider: "google_places", endpoint: "place_details", units: 1 });
    // $17/1000 = $0.017. R18.5 * 0.017 * 100 = 31.45 -> ceil 32 cents
    expect(r.wholesaleCents).toBe(32);
  });

  it("prices a Hunter email_finder call", () => {
    const r = computePipelineCallCost({ provider: "hunter", endpoint: "email_finder", units: 1 });
    // $0.098/call. R18.5 * 0.098 * 100 = 181.3 -> ceil 182 cents
    expect(r.wholesaleCents).toBe(182);
  });

  it("scales by unit_count", () => {
    const r = computePipelineCallCost({ provider: "google_places", endpoint: "text_search", units: 10 });
    expect(r.wholesaleCents).toBe(600);
  });
});
