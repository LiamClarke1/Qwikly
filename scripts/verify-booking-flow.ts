/**
 * End-to-end verification of the qwikly.co.za chat booking flow.
 *
 * Run:
 *   STEP=check  npx tsx scripts/verify-booking-flow.ts
 *     → Reports DB state, OAuth, env vars, and prints next available slots.
 *       Does NOT create a calendar event or send any emails.
 *
 *   STEP=book   npx tsx scripts/verify-booking-flow.ts
 *     → Creates a real calendar event in Liam's connected calendar
 *       (visitor = liamclarke21@outlook.com so both emails come back to you),
 *       attaches a Google Meet link, and sends the visitor + host emails.
 *
 *   STEP=cleanup EVENT_ID=<id> npx tsx scripts/verify-booking-flow.ts
 *     → Deletes the test event and notifies the attendee.
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { createClient } from "@supabase/supabase-js";
import { calendarClient } from "../src/lib/google-calendar";
import { getAvailableSlots } from "../src/lib/booking-availability";
import { bookMeeting } from "../src/lib/booking-create";

const QWIKLY_OWN_CLIENT_ID = "1";
const TEST_VISITOR_EMAIL = "liamclarke21@outlook.com";
const TEST_VISITOR_NAME = "Booking Flow Test";

function line(label: string, value: unknown) {
  const v = value === null || value === undefined ? "(unset)" : String(value);
  console.log(`  ${label.padEnd(28)} ${v}`);
}

async function step_check() {
  console.log("\n=== STEP 1: ENV CHECK ===\n");
  line("NEXT_PUBLIC_SITE_URL",       process.env.NEXT_PUBLIC_SITE_URL ?? "(unset)");
  line("ANTHROPIC_API_KEY",          process.env.ANTHROPIC_API_KEY ? "set" : "(unset)");
  line("RESEND_API_KEY",             process.env.RESEND_API_KEY ? "set" : "(unset)");
  line("RESEND_FROM",                process.env.RESEND_FROM ?? "(unset, will use default)");
  line("GOOGLE_CLIENT_ID",           process.env.GOOGLE_CLIENT_ID ? "set" : "(unset)");
  line("GOOGLE_CLIENT_SECRET",       process.env.GOOGLE_CLIENT_SECRET ? "set" : "(unset)");
  line("QWIKLY_OWN_NOTIFICATION_EMAIL", process.env.QWIKLY_OWN_NOTIFICATION_EMAIL ?? "(unset, will fall back to businesses lookup)");

  console.log("\n=== STEP 2: DB CHECK (clients row for client_id=1) ===\n");
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: client, error } = await sb
    .from("clients")
    .select("id, business_name, auth_user_id, google_access_token, google_refresh_token, google_calendar_id, google_token_expiry")
    .eq("id", QWIKLY_OWN_CLIENT_ID)
    .maybeSingle();

  if (error) {
    console.log("  ❌ DB error:", error.message);
    return;
  }
  if (!client) {
    console.log("  ❌ No clients row exists for id=1. Bookings will fail.");
    return;
  }
  line("client.id",                  client.id);
  line("client.business_name",       client.business_name);
  line("client.auth_user_id",        client.auth_user_id);
  line("google_access_token",        client.google_access_token ? `set (${String(client.google_access_token).slice(0, 16)}...)` : "(unset — calendar NOT connected)");
  line("google_refresh_token",       client.google_refresh_token ? "set" : "(unset)");
  line("google_calendar_id",         client.google_calendar_id ?? "primary (default)");
  line("google_token_expiry",        client.google_token_expiry ? new Date(client.google_token_expiry).toISOString() : "(unset)");

  if (!client.google_access_token) {
    console.log("\n  ⛔ Calendar is NOT connected for client_id=1.");
    console.log("     Until it is, get_availability returns calendar_not_connected and bookings fall back to the manual WhatsApp path.");
    console.log("     Connect via /api/calendar/connect signed in as the auth_user_id above.");
    return;
  }

  console.log("\n=== STEP 3: LIVE CALENDAR PROBE (events.list) ===\n");
  try {
    const cal = calendarClient(
      client.google_access_token,
      client.google_refresh_token ?? "",
      client.google_token_expiry,
      QWIKLY_OWN_CLIENT_ID
    );
    const probe = await cal.events.list({
      calendarId: client.google_calendar_id?.trim() || "primary",
      timeMin: new Date().toISOString(),
      timeMax: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      maxResults: 5,
      singleEvents: true,
      orderBy: "startTime",
    });
    console.log(`  ✓ Calendar API reachable. Found ${probe.data.items?.length ?? 0} upcoming event(s) in next 7 days.`);
    (probe.data.items ?? []).slice(0, 3).forEach((ev) => {
      console.log(`    · ${ev.start?.dateTime ?? ev.start?.date} → ${ev.summary ?? "(no title)"}`);
    });
  } catch (err) {
    console.log("  ❌ Calendar API call failed:", (err as Error).message);
    return;
  }

  console.log("\n=== STEP 4: getAvailableSlots() ===\n");
  const slots = await getAvailableSlots(QWIKLY_OWN_CLIENT_ID);
  if (!slots.ok) {
    console.log("  ❌ Slots not returned:", slots.reason, slots.message ?? "");
    return;
  }
  console.log(`  ✓ ${slots.slots.length} slot(s) returned. First few:`);
  slots.slots.slice(0, 8).forEach((s, i) => {
    console.log(`    ${String(i + 1).padStart(2)}. ${s.label}   [${s.start}]`);
  });

  if (slots.slots.length === 0) {
    console.log("\n  ⚠ No slots available. Either calendar is full for next 7 days, or working-hours window is exhausted.");
  } else {
    console.log("\n=== READY TO BOOK ===");
    console.log("  Run:  STEP=book npx tsx scripts/verify-booking-flow.ts");
    console.log("  This will create a REAL test event on your calendar and send TWO emails to you.");
  }
}

async function step_book() {
  console.log("\n=== BOOKING TEST EVENT ===\n");

  const slots = await getAvailableSlots(QWIKLY_OWN_CLIENT_ID);
  if (!slots.ok) {
    console.log("  ❌ Slots fetch failed:", slots.reason, slots.message ?? "");
    return;
  }
  if (slots.slots.length === 0) {
    console.log("  ❌ No slots available to book.");
    return;
  }
  const slot = slots.slots[0];
  console.log(`  Picking first available slot:  ${slot.label}`);
  console.log(`     start (UTC): ${slot.start}`);
  console.log(`     end   (UTC): ${slot.end}`);
  console.log(`     visitor:     ${TEST_VISITOR_NAME} <${TEST_VISITOR_EMAIL}>`);

  const result = await bookMeeting({
    clientId: QWIKLY_OWN_CLIENT_ID,
    visitorName: TEST_VISITOR_NAME,
    visitorEmail: TEST_VISITOR_EMAIL,
    visitorPhone: "+27821234567",
    businessType: "Test booking — DELETE ME",
    start: slot.start,
    end: slot.end,
    notes: "End-to-end verification of qwikly.co.za chat booking flow.",
  });

  console.log("\n=== RESULT ===\n");
  if (!result.ok) {
    console.log("  ❌ bookMeeting failed:", result.reason, result.message ?? "");
    return;
  }
  line("eventId",   result.eventId);
  line("eventLink", result.eventLink);
  line("meetLink",  result.meetLink);
  line("scheduled", result.label);

  console.log("\n=== VERIFY ===");
  console.log("  1. Open the eventLink above — confirm it shows on your Google Calendar.");
  console.log("  2. Click the meetLink — confirm it joins a Google Meet room.");
  console.log("  3. Check your inbox for two emails:");
  console.log("       a. \"Your Qwikly call is booked — ...\"  (visitor confirmation)");
  console.log("       b. \"New Qwikly booking — ...\"          (host notification)");
  console.log("\n  Once verified, DELETE the test event with:");
  console.log(`       STEP=cleanup EVENT_ID=${result.eventId} npx tsx scripts/verify-booking-flow.ts`);
}

async function step_cleanup() {
  const eventId = process.env.EVENT_ID;
  if (!eventId) {
    console.log("Set EVENT_ID=<id> to delete the test event.");
    return;
  }
  const sb = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  const { data: client } = await sb
    .from("clients")
    .select("google_access_token, google_refresh_token, google_calendar_id, google_token_expiry")
    .eq("id", QWIKLY_OWN_CLIENT_ID)
    .maybeSingle();
  if (!client?.google_access_token) {
    console.log("Calendar not connected — nothing to delete.");
    return;
  }
  const cal = calendarClient(
    client.google_access_token,
    client.google_refresh_token ?? "",
    client.google_token_expiry,
    QWIKLY_OWN_CLIENT_ID
  );
  await cal.events.delete({
    calendarId: client.google_calendar_id?.trim() || "primary",
    eventId,
    sendUpdates: "all",
  });
  console.log(`✓ Deleted event ${eventId} and notified attendees.`);
}

async function main() {
  const step = (process.env.STEP ?? "check").toLowerCase();
  if (step === "check") await step_check();
  else if (step === "book") await step_book();
  else if (step === "cleanup") await step_cleanup();
  else console.log("Unknown STEP. Use STEP=check | STEP=book | STEP=cleanup EVENT_ID=...");
}

main().catch((err) => {
  console.error("\n❌ Script crashed:", err);
  process.exit(1);
});
