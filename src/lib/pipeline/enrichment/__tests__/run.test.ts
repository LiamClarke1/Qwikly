import { describe, it, expect, vi } from "vitest";

// Mock the dependencies BEFORE importing the module under test.
vi.mock("@/lib/pipeline/scraper/site-reader", () => ({
  readSite: vi.fn(async () => {
    throw new Error("boom");
  }),
}));
vi.mock("@/lib/pipeline/enrichment/google-places-profile", () => ({
  lookupClientBusinessProfile: vi.fn(async () => ({})),
}));
vi.mock("@/lib/pipeline/enrichment/anthropic-synthesis", () => ({
  synthesiseIcp: vi.fn(async () => ({
    icp: {
      offer: "test",
      industries: ["x"],
      titles: ["y"],
      sizeMin: 1,
      sizeMax: 5,
      locations: ["z"],
      intentSignals: ["a"],
      dealValueZar: 1,
    },
    provenance: {},
    warnings: [],
  })),
}));

import { runEnrichment } from "../run";

describe("runEnrichment", () => {
  it("aggregates warnings when site-reader fails but synthesis succeeds", async () => {
    const r = await runEnrichment({
      clientId: 1,
      websiteUrl: "http://x",
      offer: "y",
    });
    expect(r.warnings).toContain(
      "We couldn't read your website, the ICP is based on your offer and Google profile only.",
    );
    expect(r.icp.industries).toContain("x");
  });
});
