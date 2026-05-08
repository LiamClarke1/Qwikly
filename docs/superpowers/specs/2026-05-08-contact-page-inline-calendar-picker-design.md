# Contact Page — Inline Calendar Picker

**Date:** 2026-05-08
**Status:** Draft, awaiting user review
**Surface:** `qwikly.co.za/contact` (`src/app/(landing)/contact/`)

## Goal

When a visitor on `/contact` selects **Subject = "Book a setup call"**, replace the **Message** textarea with an inline date + time picker driven by Liam's live Google Calendar availability. The visitor picks a day, picks a time, clicks **Book setup call**, and the slot is locked in immediately, the Google Meet link is emailed straight away, and the success screen tells them to check their spam or junk folder for the invite.

For every other Subject value, the form behaves exactly as it does today.

## Non-goals

- No changes to the page header, the left EMAIL/HOURS/LOCATION block, the Name field, the Email field, or the Phone field.
- No changes to the existing token-based booking flow used by the chat widget (`/book/[token]`, `/api/web/bookings`, `bookMeeting()`).
- No new "AI" or "bot" wording, per the Qwikly brand language rule.
- No phone capture for the booking itself, per the email-only booking rule. Phone stays optional on the contact form because the form serves multiple subjects.
- No SMS, no calendar provider other than the existing Google Calendar integration.

## Behaviour

### Default state

The form renders as today. Subject defaults to "Select a topic". Message textarea is visible.

### Switching to "Book a setup call"

When the visitor changes Subject to "Book a setup call":

1. The Message textarea is unmounted.
2. A **CalendarPicker** component is mounted in its place.
3. The picker fetches availability from `GET /api/web/contact-availability` once. While the request is in flight, the picker shows a quiet skeleton (month grid greyed out, "Loading times…" in the right column).
4. The submit button label changes from **Send message** to **Book setup call** and stays disabled until both a day and a time are selected.

When the visitor changes Subject away from "Book a setup call", the picker is unmounted, the Message textarea returns, the button label flips back to **Send message**.

### Picker layout

Two-column inside the field area, light theme matching the rest of `/contact`:

- **Left column (month grid):**
  - Month name + year as the header (e.g. "May 2026"), with prev/next chevron buttons.
  - 7-column grid, Sun–Sat, day numbers as cells.
  - Days with at least one available slot in the fetched payload: clickable, ink text.
  - Days with no available slots (fully booked, weekends-off, outside the 30-day window): dimmed, not clickable.
  - Today's date: subtle ring.
  - Selected day: ember background, paper text.
  - Prev arrow disabled if it would go before the current month. Next arrow disabled if it would go past the last month containing slots.

- **Right column (time slots):**
  - When no day is selected: muted helper text "Pick a day to see times."
  - When a day is selected: vertical list of pill buttons, one per available slot for that day, labelled `HH:mm` 24-hour, in SAST. Selected pill: ember background, paper text. Unselected: white background, ink border.

- **Below picker (full width):** a single muted line "15-minute Google Meet, Africa/Johannesburg time."

### Confirming the booking

When the visitor has selected a day and a time and clicked **Book setup call**:

1. Form posts to a new server action `bookSetupCall()`.
2. Server action validates: name (≥2 chars), email (valid), phone (optional, ≤20 chars), `slot_start` ISO datetime, `slot_end` ISO datetime.
3. Server action calls `bookMeeting({ clientId: QWIKLY_OWN_CLIENT_ID, visitorName, visitorEmail, visitorPhone, start, end, notes: "Booked via /contact setup-call picker.", conversationId: null })`.
4. Server action also writes a row to `support_messages` (subject = "Book a setup call", message = "Slot booked: {label}") so the contact-form audit trail stays consistent with other subjects.
5. On success, returns `{ success: true, setupCallTriggered: true, sentToEmail: email, bookedLabel: "Monday, 11 May, 14:00" }`.
6. On `slot_taken`, returns `{ success: false, error: "That slot was just taken — pick another time." }` and the picker re-fetches availability.
7. On `calendar_not_connected` / `calendar_disconnected` / other failure: returns `{ success: false, error: "Live calendar is offline right now — drop us a note instead.", revertToTextarea: true }`. The form re-renders with the message textarea so the visitor can still send a note via the existing `submitContactForm` path.

### Success screen

The existing success card is reused with new copy when `setupCallTriggered === true`:

- **Heading:** "You're booked in"
- **Body:** "We've locked in {bookedLabel}. The Google Meet invite has just been sent to {email}."
- **Footer line:** "Don't see it? Check your spam or junk folder in case it got filtered."

## Architecture

### New files

- `src/app/(landing)/contact/CalendarPicker.tsx` — client component. Props: `availability: Record<string, Slot[]>`, `selectedSlot: Slot | null`, `onSelect: (slot: Slot | null) => void`, `onRetry: () => void`, `loading: boolean`, `error: string | null`. Owns its own internal `selectedDayKey` state. Pure presentation + selection, no fetching.
- `src/app/(landing)/contact/useAvailability.ts` — small hook used by `ContactForm` that fetches `/api/web/contact-availability` on demand and exposes `{ availability, loading, error, refetch }`.
- `src/app/api/web/contact-availability/route.ts` — `GET` route. No body, no params. Calls `getAvailableSlots(QWIKLY_OWN_CLIENT_ID, { lookaheadDays: 30, maxSlots: 200, maxPerDay: 8, granularityMin: 60 })`. Groups the returned slots by SAST day key (`YYYY-M-D`) and returns `{ ok: true, availability: Record<string, Slot[]> }` or `{ ok: false, reason }` mirroring the underlying `AvailabilityResult` shape. Includes the same permissive CORS headers as `/api/web/bookings` so this can be reused later from the embed if needed.

### Changed files

- `src/app/(landing)/contact/ContactForm.tsx`
  - Add controlled `subject` state so the form can react to subject changes.
  - When `subject === "Book a setup call"`, render `<CalendarPicker>` instead of the message textarea, and use the `bookSetupCall` action instead of `submitContactForm`.
  - Submit button label flips between **Send message** and **Book setup call**.
  - Success card branch reuses existing markup with the new copy when `setupCallTriggered === true`.

- `src/app/(landing)/contact/actions.ts`
  - Add `bookSetupCall(prev, formData)` server action. Self-contained: validates fields with zod, writes to `support_messages`, calls `bookMeeting()`, returns the success/error shape described above.
  - Remove the existing setup-call branch inside `submitContactForm()` (lines 96–136) that emails three slot-picker links. The inline picker replaces it. `submitContactForm()` stays in place for every other subject and keeps its visitor ack + host notification email behaviour.

### Data flow

```
ContactForm
  ├─ subject = "Book a setup call"?
  │     ├─ no  → render textarea, action = submitContactForm
  │     └─ yes → useAvailability() → fetch /api/web/contact-availability
  │              ├─ loading → skeleton
  │              ├─ error   → fallback message + revert link
  │              └─ ok      → render CalendarPicker
  │                            └─ on select → form fields slot_start, slot_end set
  │                            └─ on submit → bookSetupCall
  │                                            └─ bookMeeting() → Google Calendar event + Meet link + visitor email
  │                                            └─ success card with "check your spam/junk" copy
```

### Slot grouping helper

The new API route groups slots by SAST day so the picker can build the month grid without each cell hitting the server. Day key format: `YYYY-M-D` (matching the existing `sastDayKey` helper in `booking-availability.ts`, which is exported). Use that helper to keep the format consistent.

## Error handling

| Failure | Visitor sees | Behind the scenes |
|---|---|---|
| Availability fetch fails (network, 5xx) | "Live calendar is offline right now — drop us a note instead." with a "Send a message" link that flips back to the textarea | Logged via `console.error` |
| Availability returns `calendar_not_connected` | Same as above | Logged with reason |
| No slots in next 30 days | "No slots in the next 30 days — drop a note and we'll reach out." with the same "Send a message" link | Not an error, just empty payload |
| `bookSetupCall` returns `slot_taken` | Inline error above the picker: "That slot was just taken — pick another time." Picker re-fetches | `bookMeeting` already handles this case |
| `bookSetupCall` returns any other failure | Inline error: "Couldn't lock that in. Try another time, or send a note instead." | Logged |
| Visitor submits without picking a slot | Button stays disabled, no submit fires | n/a |
| Visitor types into name/email then switches subject back and forth | Field values preserved across re-renders | Use stable input ids, don't unmount the parent form |

## Testing

- **Unit (Vitest):**
  - `bookSetupCall` server action: success path, missing slot, slot_taken bubble-up, calendar disconnected bubble-up.
  - `CalendarPicker`: renders selectable days only for keys present in the payload, time pills appear on day select, selecting a pill calls `onSelect`, prev/next month navigation respects boundaries.
  - `useAvailability`: fetches once on mount, re-fetches on `refetch()`, exposes loading + error correctly.
- **Manual smoke (per the project rule on UI verification):**
  1. `npm run dev` in `~/qwikly-site`, open `/contact`.
  2. Select Subject = "Book a setup call". Picker appears, message textarea gone, button label is "Book setup call".
  3. Click a dimmed day — nothing happens.
  4. Click an available day — time pills render.
  5. Click a time — button enables.
  6. Click Book setup call — success screen with "check your spam/junk" copy.
  7. Verify event appears in Liam's Google Calendar with a Meet link.
  8. Verify visitor email arrives with the Meet link (check the `from` address still resolves).
  9. Switch Subject back to "Pricing question" — textarea returns, button label is "Send message".
  10. Pick "Book a setup call" again, force `getAvailableSlots` to fail (temporarily disconnect calendar in env / flip a flag) — fallback message + revert-to-textarea link appears.

## Out of scope (explicit)

- Booking duration is fixed at 15 minutes (matches the existing `getAvailableSlots` default and the copy on `/book/[token]`). No per-visitor duration choice.
- Timezone is fixed at SAST. No timezone picker. The reference Cal.com image shows a timezone control, we don't.
- No "12h / 24h" toggle. 24h SAST only, consistent with the rest of the Qwikly site.
- No avatar / "About Liam" panel inside the picker.
- No analytics events beyond what already fires for the contact form.

## Risks / decisions to flag

- **Removing the email-three-slots branch:** the existing `submitContactForm` setup-call path will go away. Any in-flight visitor emails sent before this ships will still resolve via `/book/[token]`, since that route is untouched. No migration concern.
- **Single-payload availability:** fetching 30 days × ≤8 slots = ≤240 entries is small, so one upfront fetch is cheaper than per-day round-trips and lets the month grid show day-availability state without flicker.
- **Calendar-not-connected fallback to textarea:** keeps the page useful in degraded mode and avoids a dead end. Documented in the table above.
