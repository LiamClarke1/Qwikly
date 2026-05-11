import { describe, it, expect, vi, beforeEach } from "vitest";
import type { PlaceResult } from "@/lib/pipeline/scraper/google-places.types";
import type { SiteRecon as ScraperSiteRecon } from "@/lib/pipeline/scraper/site-reader.types";
import type {
  HunterEmailResult,
  HunterVerificationStatus,
} from "@/lib/pipeline/scraper/hunter.types";

// --- shared mock state -------------------------------------------------
// vi.mock factories below read these; tests mutate per case before
// invoking runGeneratorAndInsert.

interface CandidateSpec {
  placeName: string;
  domain: string;
  email: string;
  firstName: string;
  lastName: string;
  position: string;
  verification: HunterVerificationStatus;
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
  existingEmails: string[];
  insertedRows: unknown[];
  capCalls: Array<{ clientId: string | number; plan: string; projectedCents: number }>;
  placesCalls: number;
  hunterCalls: Array<{ domain: string; clientId: string | number }>;
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
  existingEmails: [],
  insertedRows: [],
  capCalls: [],
  placesCalls: 0,
  hunterCalls: [],
};

function makeCandidate(overrides: Partial<CandidateSpec> & { email: string }): CandidateSpec {
  return {
    placeName: "Test Co",
    domain: "example.com",
    email: overrides.email,
    firstName: "Test",
    lastName: "Person",
    position: "CEO",
    verification: "valid",
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

vi.mock("../../scraper/hunter", () => ({
  findEmailForDomain: vi.fn(
    async (
      domain: string,
      clientId: string | number,
    ): Promise<HunterEmailResult | null> => {
      state.hunterCalls.push({ domain, clientId });
      const match = state.candidates.find((c) => c.domain === domain);
      if (!match) return null;
      return {
        email: match.email,
        first_name: match.firstName,
        last_name: match.lastName,
        position: match.position,
        confidence: 90,
        verification_status: match.verification,
        source: "email_finder",
      };
    },
  ),
}));

// Hook generator does a real LLM call. Stub it so tests stay offline.
vi.mock("../../hook-generator", () => ({
  generateHook: vi.fn(async () => ""),
}));

// In-memory supabaseAdmin stub. select(...).eq(...).in(...) yields the
// existing-emails fixture; insert(rows) records the rows.
vi.mock("@/lib/supabase-server", () => ({
  supabaseAdmin: () => ({
    from: (_table: string) => {
      const builder = {
        select(_cols: string) {
          return this;
        },
        eq(_col: string, _val: unknown) {
          return this;
        },
        in(_col: string, _vals: unknown[]) {
          return Promise.resolve({
            data: state.existingEmails.map((e) => ({ email: e })),
            error: null,
          });
        },
        insert(rows: unknown[]) {
          state.insertedRows.push(...rows);
          return Promise.resolve({ data: rows, error: null });
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
  state.existingEmails = [];
  state.insertedRows = [];
  state.capCalls = [];
  state.placesCalls = 0;
  state.hunterCalls = [];
});

import { runGeneratorAndInsert } from "../run";

describe("runGeneratorAndInsert", () => {
  it("returns capReached:true and inserts nothing when the cap-check is over", async () => {
    state.capResult = { over: true, spentCents: 26000, capCents: 25000 };
    state.candidates = [makeCandidate({ email: "a@example.com" })];

    const r = await runGeneratorAndInsert({
      clientId: 1,
      businessId: "biz-uuid",
      plan: "pipeline_lite",
      count: 5,
      batchKind: "first_batch",
    });

    expect(r).toEqual({ created: 0, capReached: true });
    expect(state.placesCalls).toBe(0);
    expect(state.hunterCalls).toHaveLength(0);
    expect(state.insertedRows).toHaveLength(0);
    expect(state.capCalls).toHaveLength(1);
    // Projected cost should be count * 274 cents = 5 * 274 = 1370.
    expect(state.capCalls[0].projectedCents).toBe(5 * 274);
  });

  it("filters out candidates whose email is not verified as 'valid'", async () => {
    // Five strong candidates (high score) with varying verification statuses.
    // Only the two "valid" ones should be inserted.
    state.candidates = [
      makeCandidate({ domain: "good1.com", email: "good1@good1.com", verification: "valid" }),
      makeCandidate({
        domain: "accept.com",
        email: "accept@accept.com",
        verification: "accept_all",
      }),
      makeCandidate({
        domain: "invalid.com",
        email: "invalid@invalid.com",
        verification: "invalid",
      }),
      makeCandidate({
        domain: "unknown.com",
        email: "unknown@unknown.com",
        verification: "unknown",
      }),
      makeCandidate({ domain: "good2.com", email: "good2@good2.com", verification: "valid" }),
    ];

    const r = await runGeneratorAndInsert({
      clientId: 1,
      businessId: "biz-uuid",
      plan: "pipeline_lite",
      count: 10,
      batchKind: "daily_trickle",
    });

    expect(r.capReached).toBe(false);
    // We expect 2 valid + verified survivors. They must also reach score >= 9
    // given the strong fixture (industry match, location match, full recon,
    // good rating, full contact). The scorer is deterministic.
    expect(r.created).toBe(2);
    expect(state.insertedRows).toHaveLength(2);

    const insertedEmails = (state.insertedRows as Array<{ email: string }>).map(
      (row) => row.email,
    );
    expect(insertedEmails.sort()).toEqual(
      ["good1@good1.com", "good2@good2.com"].sort(),
    );

    // Inserted rows should carry batch tags + the right business id.
    for (const row of state.insertedRows as Array<{
      business_id: string;
      delivery_batch_kind: string;
      delivery_batch_date: string;
      enrichment_score: number;
    }>) {
      expect(row.business_id).toBe("biz-uuid");
      expect(row.delivery_batch_kind).toBe("daily_trickle");
      expect(row.delivery_batch_date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      // enrichment_score is score * 10, clamped 0..100.
      expect(row.enrichment_score).toBeGreaterThanOrEqual(90);
    }
  });

  it("dedupes against existing pipeline_prospects rows by lowercased email", async () => {
    state.existingEmails = ["already@example.com"];
    state.candidates = [
      // Same email as the existing row but different case: should be skipped.
      makeCandidate({
        domain: "example.com",
        email: "Already@Example.com",
        verification: "valid",
      }),
      makeCandidate({
        domain: "fresh.com",
        email: "fresh@fresh.com",
        verification: "valid",
      }),
    ];

    const r = await runGeneratorAndInsert({
      clientId: 1,
      businessId: "biz-uuid",
      plan: "pipeline_pro",
      count: 5,
      batchKind: "first_batch",
    });

    expect(r.capReached).toBe(false);
    expect(r.created).toBe(1);
    const insertedEmails = (state.insertedRows as Array<{ email: string }>).map(
      (row) => row.email,
    );
    expect(insertedEmails).toEqual(["fresh@fresh.com"]);
  });

  it("threads clientId into every hunter call so spend is tagged correctly", async () => {
    state.candidates = [
      makeCandidate({ domain: "good.com", email: "good@good.com", verification: "valid" }),
    ];

    await runGeneratorAndInsert({
      clientId: 42,
      businessId: "biz-uuid",
      plan: "pipeline_lite",
      count: 5,
      batchKind: "first_batch",
    });

    expect(state.hunterCalls.length).toBeGreaterThanOrEqual(1);
    for (const call of state.hunterCalls) {
      expect(call.clientId).toBe(42);
    }
  });
});
