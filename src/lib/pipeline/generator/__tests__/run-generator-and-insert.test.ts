import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlaceResult } from "@/lib/pipeline/scraper/google-places.types";
import type { SiteRecon as ScraperSiteRecon } from "@/lib/pipeline/scraper/site-reader.types";
import type { ScrapedEmail } from "@/lib/pipeline/scraper/website-email";

// --- shared mock state -------------------------------------------------
// vi.mock factories below read these; tests mutate per case before
// invoking runGeneratorAndInsert.

interface CandidateSpec {
  placeName: string;
  domain: string;
  scrapedEmail: ScrapedEmail;
  city: string;
  industryTypes: string[];
  rating: number;
  reviewsCount: number;
  phone: string;
}

const state: {
  capResult: { over: boolean; spentCents: number; capCents: number };
  setupIcp: {
    offer: string;
    industries: string[];
    titles: string[];
    sizeMin: number;
    sizeMax: number;
    locations: string[];
    intentSignals: string[];
    dealValueZar: number;
  };
  candidates: CandidateSpec[];
  existingProspects: Array<{ email: string | null; website: string | null; company: string | null }>;
  insertedRows: Array<Record<string, unknown>>;
  capCalls: Array<{ clientId: string | number; plan: string; projectedCents: number }>;
  placesCalls: number;
  scrapeEmailCalls: Array<string>;
} = {
  capResult: { over: false, spentCents: 0, capCents: 25000 },
  setupIcp: {
    offer: "test offer",
    industries: ["Marketing"],
    titles: ["CEO"],
    sizeMin: 5,
    sizeMax: 50,
    locations: ["Cape Town"],
    intentSignals: [],
    dealValueZar: 20000,
  },
  candidates: [],
  existingProspects: [],
  insertedRows: [],
  capCalls: [],
  placesCalls: 0,
  scrapeEmailCalls: [],
};

function makeCandidate(overrides: Partial<CandidateSpec> & { scrapedEmail: ScrapedEmail }): CandidateSpec {
  return {
    placeName: "Test Co",
    domain: "example.com",
    city: "Cape Town",
    industryTypes: ["marketing_agency"],
    rating: 4.7,
    reviewsCount: 50,
    phone: "+27 11 555 0100",
    ...overrides,
  };
}

// --- mocks (hoisted before the SUT import) -----------------------------

vi.mock("../../billing/cap-check", () => ({
  checkCapForTenant: vi.fn(
    async (args: { clientId: string | number; plan: string; projectedCents: number }) => {
      state.capCalls.push(args);
      return state.capResult;
    },
  ),
}));

vi.mock("../../setup-state", () => ({
  getSetupState: vi.fn(async () => ({
    icp: state.setupIcp,
    status: "generated",
    last_generated_at: null,
  })),
}));

vi.mock("../../scraper/google-places", () => ({
  searchBusinesses: vi.fn(async (): Promise<PlaceResult[]> => {
    state.placesCalls += 1;
    return state.candidates.map((c, i) => ({
      place_id: `pid-${i}`,
      name: c.placeName,
      formatted_address: `${c.placeName}, ${c.city}, South Africa`,
      formatted_phone_number: c.phone,
      website: `https://${c.domain}`,
      types: c.industryTypes,
      rating: c.rating,
      user_ratings_total: c.reviewsCount,
      business_status: "OPERATIONAL",
      geometry: { location: { lat: -33.9, lng: 18.4 } },
    }));
  }),
}));

vi.mock("../../scraper/site-reader", () => ({
  readSite: vi.fn(async (url: string): Promise<ScraperSiteRecon> => ({
    ok: true,
    url,
    title: "Marketing Co Cape Town",
    h1: "We help SMBs grow",
    meta_description:
      "A marketing agency helping South African SMBs grow with paid ads and CRO.",
    hero_text:
      "We are a Cape Town marketing agency that helps SMBs grow through paid ads, CRO, and lifecycle email. We work with founders who want clear results.",
    services_text: "Paid ads, CRO, lifecycle email",
    last_scraped_at: new Date().toISOString(),
  })),
}));

vi.mock("../../scraper/website-email", () => ({
  scrapeEmailFromWebsite: vi.fn(async (websiteUrl: string): Promise<ScrapedEmail> => {
    state.scrapeEmailCalls.push(websiteUrl);
    const host = (() => {
      try {
        return new URL(websiteUrl).hostname.replace(/^www\./, "");
      } catch {
        return "";
      }
    })();
    const match = state.candidates.find((c) => c.domain === host);
    if (!match) return { email: "", source: "not_found" };
    return match.scrapedEmail;
  }),
}));

vi.mock("../../hook-generator", () => ({
  generateHook: vi.fn(async () => ""),
}));

// In-memory supabaseAdmin stub. select(...).eq(...) resolves to the
// existingProspects fixture; insert(rows) records the rows.
vi.mock("@/lib/supabase-server", () => ({
  supabaseAdmin: () => ({
    from: (_table: string) => {
      const resolvedReadResult = {
        data: state.existingProspects,
        error: null,
      };
      const builder = {
        select(_cols: string) {
          return this;
        },
        eq(_col: string, _val: unknown) {
          // Read paths resolve here; both then-chained and awaited cases
          // are covered because this object is thenable below.
          return this;
        },
        in(_col: string, _vals: unknown[]) {
          return Promise.resolve(resolvedReadResult);
        },
        insert(rows: unknown[]) {
          state.insertedRows.push(...(rows as Array<Record<string, unknown>>));
          return Promise.resolve({ data: rows, error: null });
        },
        then(onFulfilled: (v: typeof resolvedReadResult) => unknown) {
          return Promise.resolve(resolvedReadResult).then(onFulfilled);
        },
      };
      return builder;
    },
  }),
}));

// Make sure runGenerator takes the live path (requires the env key set).
beforeEach(() => {
  process.env.GOOGLE_PLACES_API_KEY = "fake-test-key";
  state.capResult = { over: false, spentCents: 0, capCents: 25000 };
  state.setupIcp = {
    offer: "test offer",
    industries: ["Marketing"],
    titles: ["CEO"],
    sizeMin: 5,
    sizeMax: 50,
    locations: ["Cape Town"],
    intentSignals: [],
    dealValueZar: 20000,
  };
  state.candidates = [];
  state.existingProspects = [];
  state.insertedRows = [];
  state.capCalls = [];
  state.placesCalls = 0;
  state.scrapeEmailCalls = [];
});

import { runGeneratorAndInsert } from "../run";

describe("runGeneratorAndInsert", () => {
  it("returns capReached:true and inserts nothing when the cap-check is over", async () => {
    state.capResult = { over: true, spentCents: 26000, capCents: 25000 };
    state.candidates = [
      makeCandidate({ scrapedEmail: { email: "a@example.com", source: "website_mailto" } }),
    ];

    const r = await runGeneratorAndInsert({
      clientId: 1,
      businessId: "biz-uuid",
      plan: "pipeline_lite",
      count: 5,
      batchKind: "first_batch",
    });

    expect(r).toEqual({ created: 0, capReached: true });
    expect(state.placesCalls).toBe(0);
    expect(state.scrapeEmailCalls).toHaveLength(0);
    expect(state.insertedRows).toHaveLength(0);
    expect(state.capCalls).toHaveLength(1);
    // Projected cost is count * 274 cents = 5 * 274 = 1370. (Hunter cost
    // line is still in the projection — overestimate is fine, the floor
    // is the real spending guard.)
    expect(state.capCalls[0].projectedCents).toBe(5 * 274);
  });

  it("delivers top-scoring prospects regardless of email presence (Hunter dropped)", async () => {
    // After dropping Hunter (2026-05-11), prospects without an email are
    // still delivered. Scoring already weights email + verification into
    // contact_completeness, so prospects with emails tend to score
    // higher, but the hard email filter is gone. We don't assert which
    // exact prospects get picked because that depends on scoring weights;
    // we assert (a) the call goes through, (b) returned rows carry
    // delivery batch metadata, and (c) email_source flows into icp_match.
    state.candidates = [
      makeCandidate({
        placeName: "Mailto Co",
        domain: "mailto-co.com",
        scrapedEmail: { email: "info@mailto-co.com", source: "website_mailto" },
      }),
      makeCandidate({
        placeName: "Text Co",
        domain: "text-co.com",
        scrapedEmail: { email: "hello@text-co.com", source: "website_text" },
      }),
      makeCandidate({
        placeName: "Form Only Co",
        domain: "form-co.com",
        scrapedEmail: { email: "", source: "not_found" },
      }),
    ];

    const r = await runGeneratorAndInsert({
      clientId: 1,
      businessId: "biz-uuid",
      plan: "pipeline_lite",
      count: 10,
      batchKind: "daily_trickle",
    });

    expect(r.capReached).toBe(false);
    expect(state.scrapeEmailCalls.length).toBe(3);
    expect(state.insertedRows.length).toBeGreaterThanOrEqual(1);

    // Every inserted row carries batch metadata and an icp_match block
    // with email_source so the dashboard can render an honest label.
    for (const row of state.insertedRows) {
      expect(row.business_id).toBe("biz-uuid");
      expect(row.delivery_batch_kind).toBe("daily_trickle");
      expect(row.delivery_batch_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const icpMatch = row.icp_match as Record<string, unknown>;
      expect(icpMatch).toBeDefined();
      expect(
        ["website_mailto", "website_text", "not_found"].includes(
          icpMatch.email_source as string,
        ),
      ).toBe(true);
    }
  });

  it("dedupes against existing prospects using a composite key (email > website > company)", async () => {
    // Existing rows for this tenant: one with an email, one only-website,
    // one only-company. New candidates should be filtered against all three.
    state.existingProspects = [
      { email: "already@example.com", website: "https://already.com", company: "Already Co" },
      { email: null, website: "https://no-email.com", company: "No Email Co" },
      { email: null, website: null, company: "Phone Only Co" },
    ];
    state.candidates = [
      // Same email as existing row, different case: should be deduped.
      makeCandidate({
        placeName: "Dup Email Co",
        domain: "dup-email.com",
        scrapedEmail: { email: "Already@Example.com", source: "website_mailto" },
      }),
      // No email, same host as existing no-email row: should be deduped.
      makeCandidate({
        placeName: "Dup Host Co",
        domain: "no-email.com",
        scrapedEmail: { email: "", source: "not_found" },
      }),
      // No email, no website, same company as existing: should be deduped.
      makeCandidate({
        placeName: "Phone Only Co",
        domain: "",
        scrapedEmail: { email: "", source: "not_found" },
      }),
      // Genuinely fresh.
      makeCandidate({
        placeName: "Fresh Co",
        domain: "fresh.com",
        scrapedEmail: { email: "hello@fresh.com", source: "website_mailto" },
      }),
    ];

    const r = await runGeneratorAndInsert({
      clientId: 1,
      businessId: "biz-uuid",
      plan: "pipeline_pro",
      count: 10,
      batchKind: "first_batch",
    });

    expect(r.capReached).toBe(false);
    // Only the fresh row should land. Dedupe filters out the three dups
    // regardless of whether they have an email.
    const insertedCompanies = state.insertedRows.map((row) => row.company);
    expect(insertedCompanies).toContain("Fresh Co");
    expect(insertedCompanies).not.toContain("Dup Email Co");
    expect(insertedCompanies).not.toContain("Dup Host Co");
    expect(insertedCompanies).not.toContain("Phone Only Co");
  });
});
