// Qwikly ROI report data layer.
//
// Pulls last N days of conversations + bookings for the current tenant and
// returns a strictly typed shape the UI can render without crashing if
// columns are missing. Empty / unwired sections return safe zeros so the
// page can show graceful empty states rather than throwing.
//
// Notes on schema, validated against supabase/migrations:
//   conversations: client_id (bigint), created_at, is_lead, booking_intent,
//                  customer_name, customer_phone, channel, status
//   bookings:      client_id (bigint), created_at, booking_datetime, status,
//                  customer_name, customer_email, customer_phone, source,
//                  service_price, quoted_price_zar, final_price_zar,
//                  conversation_id, completed_at
//
// We do NOT use the `leads` table here, that's the v2 widget pipeline keyed
// to `businesses`, separate from `clients`. For the dashboard ROI surface
// "leads" means a conversation where contact was captured (is_lead = true).

import type { SupabaseClient } from "@supabase/supabase-js";

// ──────────────────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────────────────

export interface RoiKpi {
  label: string;
  value: number;
  display: string;
  hasData: boolean;
  reason?: string;
  estimate?: boolean;
}

export interface RoiFunnelLevel {
  label: string;
  count: number;
  // drop-off from previous step, 0 to 1. null for the first step.
  dropOff: number | null;
}

export interface RoiResponseTime {
  medianSeconds: number | null;
  hasData: boolean;
  reason?: string;
  // Both displayed numbers are industry estimates and must be labelled as such.
  industryAverageSeconds: number;
  upliftMultiplier: number;
}

export interface RoiBookingRow {
  id: string;
  date: string | null;
  customerName: string;
  channel: string;
  status: string;
}

export type RoiSuggestion = string;

export interface RoiReport {
  generatedAt: string;
  windowDays: number;
  isEmpty: boolean;

  enquiriesCaptured: RoiKpi;
  qualifiedLeads: RoiKpi;
  jobsBooked: RoiKpi;
  revenueCaptured: RoiKpi;

  funnel: RoiFunnelLevel[];
  responseTime: RoiResponseTime;
  recentBookings: RoiBookingRow[];
  nextSteps: RoiSuggestion[];
}

// ──────────────────────────────────────────────────────────────────────────
// Constants
// ──────────────────────────────────────────────────────────────────────────

// ZAR fallback used when a real per-booking price is not available.
// Marked as "industry estimate" everywhere it surfaces.
const INDUSTRY_AVG_JOB_VALUE_ZAR = 1850;

// Industry-estimate constants for the response-time panel.
// 47 minutes, 21x uplift. Both labelled "industry estimate" in the UI.
const INDUSTRY_AVG_RESPONSE_SECONDS = 47 * 60;
const INDUSTRY_RESPONSE_UPLIFT_X = 21;

// Suggestion thresholds.
const SLOW_RESPONSE_SECONDS = 60;
const LOW_QUALIFIED_RATIO = 0.30;
const LOW_COMPLETION_RATIO = 0.50;

// Suggestion strings, exported so tests / other surfaces can reference them.
export const SUGGESTION_INSTANT_REPLY =
  "Switch on Instant Reply 60s to cut your response time and capture more bookings.";
export const SUGGESTION_TIGHTEN_QUALIFIER =
  "Tighten the pre-qualifier so Qwikly only books leads that match your service area and job type.";
export const SUGGESTION_CALENDAR_REMINDER =
  "Add the calendar reminder add-on so booked jobs convert to completed jobs more often.";

// ──────────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────────

function formatZAR(n: number): string {
  return `R${Math.round(n).toLocaleString("en-ZA")}`;
}

function safeNumber(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

function dropOff(prev: number, current: number): number | null {
  if (prev <= 0) return null;
  const ratio = 1 - current / prev;
  if (ratio < 0) return 0;
  if (ratio > 1) return 1;
  return ratio;
}

function pickChannel(row: { channel?: string | null; source?: string | null; customer_email?: string | null }): string {
  // Prefer explicit channel, fall back to booking source, then guess from email.
  const c = (row.channel ?? row.source ?? "").toLowerCase();
  if (c.includes("whatsapp")) return "whatsapp";
  if (c.includes("sms")) return "sms";
  if (c.includes("email")) return "email";
  if (c.includes("chat") || c.includes("widget")) return "direct";
  if (row.customer_email) return "email";
  return "direct";
}

// ──────────────────────────────────────────────────────────────────────────
// Main entry
// ──────────────────────────────────────────────────────────────────────────

export async function getRoiReport(
  supabase: SupabaseClient,
  tenantId: string | number | null,
  days = 30,
): Promise<RoiReport> {
  const generatedAt = new Date().toISOString();
  const empty = makeEmptyReport({ generatedAt, windowDays: days });

  if (tenantId === null || tenantId === undefined || tenantId === "") {
    return empty;
  }

  const since = new Date();
  since.setDate(since.getDate() - days);
  const sinceIso = since.toISOString();

  // Pull conversations + bookings in parallel. Failures degrade gracefully.
  const [convRes, bookRes] = await Promise.all([
    supabase
      .from("conversations")
      .select("id, created_at, is_lead, booking_intent, customer_name, customer_phone, channel, status")
      .eq("client_id", tenantId)
      .gte("created_at", sinceIso),
    supabase
      .from("bookings")
      .select(
        "id, created_at, booking_datetime, status, customer_name, customer_email, customer_phone, source, service_price, quoted_price_zar, final_price_zar, conversation_id, completed_at",
      )
      .eq("client_id", tenantId)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false }),
  ]);

  const convRows = (convRes.data ?? []) as Array<{
    id: string;
    created_at: string;
    is_lead: boolean | null;
    booking_intent: boolean | null;
    customer_name: string | null;
    customer_phone: string | null;
    channel: string | null;
    status: string | null;
  }>;

  const bookRows = (bookRes.data ?? []) as Array<{
    id: string;
    created_at: string;
    booking_datetime: string | null;
    status: string | null;
    customer_name: string | null;
    customer_email: string | null;
    customer_phone: string | null;
    source: string | null;
    service_price: number | null;
    quoted_price_zar: number | null;
    final_price_zar: number | null;
    conversation_id: string | null;
    completed_at: string | null;
  }>;

  const enquiriesCount = convRows.length;
  const qualifiedCount = convRows.filter((r) => r.is_lead === true).length;

  const bookedStatuses = new Set(["booked", "completed"]);
  const completedStatuses = new Set(["completed"]);
  const jobsBookedCount = bookRows.filter((r) => bookedStatuses.has((r.status ?? "").toLowerCase())).length;
  const completedCount = bookRows.filter((r) => completedStatuses.has((r.status ?? "").toLowerCase())).length;

  // Revenue: sum any explicit price fields. If every booking has zero/null
  // pricing, fall back to industry estimate (count x avg) and flag it.
  let realRevenue = 0;
  let realRevenueCount = 0;
  for (const r of bookRows) {
    if (!bookedStatuses.has((r.status ?? "").toLowerCase())) continue;
    const price = safeNumber(r.final_price_zar) || safeNumber(r.quoted_price_zar) || safeNumber(r.service_price);
    if (price > 0) {
      realRevenue += price;
      realRevenueCount++;
    }
  }

  const revenueIsEstimate = realRevenueCount === 0 && jobsBookedCount > 0;
  const revenueValue = revenueIsEstimate
    ? jobsBookedCount * INDUSTRY_AVG_JOB_VALUE_ZAR
    : realRevenue;

  const enquiriesCaptured: RoiKpi = {
    label: "Enquiries captured",
    value: enquiriesCount,
    display: enquiriesCount.toLocaleString("en-ZA"),
    hasData: enquiriesCount > 0,
  };
  const qualifiedLeads: RoiKpi = {
    label: "Qualified leads",
    value: qualifiedCount,
    display: qualifiedCount.toLocaleString("en-ZA"),
    hasData: qualifiedCount > 0,
  };
  const jobsBooked: RoiKpi = {
    label: "Jobs booked",
    value: jobsBookedCount,
    display: jobsBookedCount.toLocaleString("en-ZA"),
    hasData: jobsBookedCount > 0,
  };
  const revenueCaptured: RoiKpi = {
    label: "Revenue captured",
    value: revenueValue,
    display: formatZAR(revenueValue),
    hasData: revenueValue > 0,
    estimate: revenueIsEstimate,
    reason: revenueIsEstimate ? "industry estimate" : undefined,
  };

  // Funnel: visitor enquiries -> qualified -> booked -> completed
  const funnel: RoiFunnelLevel[] = [
    { label: "Visitor enquiries", count: enquiriesCount, dropOff: null },
    { label: "Qualified leads", count: qualifiedCount, dropOff: dropOff(enquiriesCount, qualifiedCount) },
    { label: "Booked jobs", count: jobsBookedCount, dropOff: dropOff(qualifiedCount, jobsBookedCount) },
    { label: "Completed jobs", count: completedCount, dropOff: dropOff(jobsBookedCount, completedCount) },
  ];

  // Response time: we don't have a reliable owner-first-reply timestamp wired
  // yet. Return a graceful "not wired" state so the panel shows the placeholder
  // copy explicitly labelled as awaiting wiring.
  const responseTime: RoiResponseTime = {
    medianSeconds: null,
    hasData: false,
    reason: "schema not yet wired",
    industryAverageSeconds: INDUSTRY_AVG_RESPONSE_SECONDS,
    upliftMultiplier: INDUSTRY_RESPONSE_UPLIFT_X,
  };

  const recentBookings: RoiBookingRow[] = bookRows.slice(0, 10).map((r) => ({
    id: String(r.id),
    date: r.booking_datetime ?? r.created_at,
    customerName: r.customer_name?.trim() || "Customer",
    channel: pickChannel(r),
    status: (r.status ?? "booked").toLowerCase(),
  }));

  // Next-step suggestions, hard-coded thresholds.
  const nextSteps: RoiSuggestion[] = [];
  if (responseTime.medianSeconds !== null && responseTime.medianSeconds > SLOW_RESPONSE_SECONDS) {
    nextSteps.push(SUGGESTION_INSTANT_REPLY);
  } else if (!responseTime.hasData) {
    // Default nudge while response time is unwired: still recommend Instant Reply.
    nextSteps.push(SUGGESTION_INSTANT_REPLY);
  }
  if (enquiriesCount > 0) {
    const ratio = qualifiedCount / enquiriesCount;
    if (ratio < LOW_QUALIFIED_RATIO) {
      nextSteps.push(SUGGESTION_TIGHTEN_QUALIFIER);
    }
  }
  if (jobsBookedCount > 0) {
    const ratio = completedCount / jobsBookedCount;
    if (ratio < LOW_COMPLETION_RATIO) {
      nextSteps.push(SUGGESTION_CALENDAR_REMINDER);
    }
  }
  // Cap to top 3 suggestions.
  const trimmedSteps = nextSteps.slice(0, 3);

  const isEmpty =
    enquiriesCount === 0 && qualifiedCount === 0 && jobsBookedCount === 0 && completedCount === 0;

  return {
    generatedAt,
    windowDays: days,
    isEmpty,
    enquiriesCaptured,
    qualifiedLeads,
    jobsBooked,
    revenueCaptured,
    funnel,
    responseTime,
    recentBookings,
    nextSteps: trimmedSteps,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// Internal: empty-state report so the UI never hits undefined fields.
// ──────────────────────────────────────────────────────────────────────────

function makeEmptyReport(args: { generatedAt: string; windowDays: number }): RoiReport {
  const zero = (label: string, display = "0"): RoiKpi => ({
    label,
    value: 0,
    display,
    hasData: false,
    reason: "schema not yet wired",
  });
  return {
    generatedAt: args.generatedAt,
    windowDays: args.windowDays,
    isEmpty: true,
    enquiriesCaptured: zero("Enquiries captured"),
    qualifiedLeads: zero("Qualified leads"),
    jobsBooked: zero("Jobs booked"),
    revenueCaptured: { ...zero("Revenue captured", "R0"), estimate: true, reason: "industry estimate" },
    funnel: [
      { label: "Visitor enquiries", count: 0, dropOff: null },
      { label: "Qualified leads", count: 0, dropOff: null },
      { label: "Booked jobs", count: 0, dropOff: null },
      { label: "Completed jobs", count: 0, dropOff: null },
    ],
    responseTime: {
      medianSeconds: null,
      hasData: false,
      reason: "schema not yet wired",
      industryAverageSeconds: INDUSTRY_AVG_RESPONSE_SECONDS,
      upliftMultiplier: INDUSTRY_RESPONSE_UPLIFT_X,
    },
    recentBookings: [],
    nextSteps: [SUGGESTION_INSTANT_REPLY],
  };
}
