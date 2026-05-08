# Contact Page Inline Calendar Picker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** On `/contact`, when Subject = "Book a setup call", replace the message textarea with a Cal.com-style date/time picker that books straight into Liam's Google Calendar and emails the Meet link immediately.

**Architecture:** New GET route `/api/web/contact-availability` returns 30 days of slots from the existing `getAvailableSlots()`, grouped by SAST day. New client `CalendarPicker` component renders a month grid + time slot list and is mounted inside `ContactForm` only when subject = setup-call. New `bookSetupCall` server action calls existing `bookMeeting()` — no new email or calendar plumbing.

**Tech Stack:** Next.js 14 App Router, React Server Actions, TypeScript, Tailwind, Zod. No vitest in this repo, so verification is `npm run lint`, `npm run build` (Next typecheck), and a manual smoke test on `npm run dev`.

**Spec:** [docs/superpowers/specs/2026-05-08-contact-page-inline-calendar-picker-design.md](../specs/2026-05-08-contact-page-inline-calendar-picker-design.md)

---

## File Plan

**New:**
- `src/app/api/web/contact-availability/route.ts` — public GET, returns availability grouped by SAST day
- `src/app/(landing)/contact/CalendarPicker.tsx` — client component, month grid + time slots, presentation only
- `src/app/(landing)/contact/useAvailability.ts` — small client hook, fetches the route on demand

**Modified:**
- `src/app/(landing)/contact/actions.ts` — add `bookSetupCall()` server action; remove the email-three-slots branch (lines 96–136) from `submitContactForm()`
- `src/app/(landing)/contact/ContactForm.tsx` — controlled subject state; conditional render of textarea vs picker; second `useFormState` for `bookSetupCall`; success card branch updated copy

---

## Task 1: Availability API route

**Files:**
- Create: `src/app/api/web/contact-availability/route.ts`

- [ ] **Step 1: Create the route file**

```typescript
import { NextResponse } from "next/server";
import { getAvailableSlots, sastDayKey } from "@/lib/booking-availability";

const QWIKLY_OWN_CLIENT_ID = process.env.QWIKLY_OWNER_CLIENT_ID ?? "1";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export type ContactAvailabilitySlot = {
  start: string;
  end: string;
  label: string;
  short_label: string;
};

export type ContactAvailabilityResponse =
  | { ok: true; availability: Record<string, ContactAvailabilitySlot[]> }
  | { ok: false; reason: "calendar_not_connected" | "calendar_disconnected" | "error"; message?: string };

export async function GET() {
  const result = await getAvailableSlots(QWIKLY_OWN_CLIENT_ID, {
    lookaheadDays: 30,
    maxSlots: 200,
    maxPerDay: 8,
    granularityMin: 60,
  });

  if (!result.ok) {
    const status = result.reason === "error" ? 503 : 200;
    return NextResponse.json(
      { ok: false, reason: result.reason, message: result.message },
      { status, headers: CORS }
    );
  }

  const grouped: Record<string, ContactAvailabilitySlot[]> = {};
  for (const slot of result.slots) {
    const key = sastDayKey(new Date(slot.start));
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(slot);
  }

  return NextResponse.json({ ok: true, availability: grouped }, { headers: CORS });
}
```

- [ ] **Step 2: Verify it builds**

Run: `cd ~/qwikly-site && npm run lint -- src/app/api/web/contact-availability/route.ts`
Expected: No errors.

- [ ] **Step 3: Hit the route locally**

Start dev server in background, then:
Run: `curl -s http://localhost:3000/api/web/contact-availability | head -c 500`
Expected: JSON with `"ok":true` and an `"availability"` object keyed by `YYYY-M-D`. If calendar is not connected in the local env, expect `{"ok":false,"reason":"calendar_not_connected"}` — that's a valid pass for this step.

- [ ] **Step 4: Commit (deferred)**

Hold the commit until the full feature lands; we ship one feature commit at the end (see Task 5).

---

## Task 2: useAvailability hook

**Files:**
- Create: `src/app/(landing)/contact/useAvailability.ts`

- [ ] **Step 1: Write the hook**

```typescript
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContactAvailabilityResponse, ContactAvailabilitySlot } from "@/app/api/web/contact-availability/route";

export type AvailabilityState = {
  loading: boolean;
  availability: Record<string, ContactAvailabilitySlot[]> | null;
  reason: "calendar_not_connected" | "calendar_disconnected" | "error" | "empty" | null;
  refetch: () => void;
};

export function useAvailability(enabled: boolean): AvailabilityState {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<Record<string, ContactAvailabilitySlot[]> | null>(null);
  const [reason, setReason] = useState<AvailabilityState["reason"]>(null);
  const reqId = useRef(0);

  const fetchOnce = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setReason(null);
    try {
      const res = await fetch("/api/web/contact-availability", { cache: "no-store" });
      const data = (await res.json()) as ContactAvailabilityResponse;
      if (id !== reqId.current) return;
      if (!data.ok) {
        setAvailability(null);
        setReason(data.reason);
      } else if (Object.keys(data.availability).length === 0) {
        setAvailability({});
        setReason("empty");
      } else {
        setAvailability(data.availability);
        setReason(null);
      }
    } catch {
      if (id !== reqId.current) return;
      setAvailability(null);
      setReason("error");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchOnce();
  }, [enabled, fetchOnce]);

  return { loading, availability, reason, refetch: fetchOnce };
}
```

- [ ] **Step 2: Lint check**

Run: `cd ~/qwikly-site && npm run lint -- src/app/\\(landing\\)/contact/useAvailability.ts`
Expected: No errors.

---

## Task 3: CalendarPicker component

**Files:**
- Create: `src/app/(landing)/contact/CalendarPicker.tsx`

- [ ] **Step 1: Write the component**

```typescript
"use client";

import { useMemo, useState } from "react";
import type { ContactAvailabilitySlot } from "@/app/api/web/contact-availability/route";

const TZ = "Africa/Johannesburg";
const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function sastTodayKey(): string {
  const now = new Date();
  const shifted = new Date(now.getTime() + 120 * 60_000);
  return `${shifted.getUTCFullYear()}-${shifted.getUTCMonth() + 1}-${shifted.getUTCDate()}`;
}

function ymdKey(year: number, month1: number, day: number): string {
  return `${year}-${month1}-${day}`;
}

function timeLabel(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-ZA", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function monthLabel(year: number, month0: number): string {
  return new Date(Date.UTC(year, month0, 1)).toLocaleDateString("en-ZA", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  });
}

export type CalendarPickerProps = {
  availability: Record<string, ContactAvailabilitySlot[]>;
  selectedSlot: ContactAvailabilitySlot | null;
  onSelect: (slot: ContactAvailabilitySlot | null) => void;
};

export default function CalendarPicker({ availability, selectedSlot, onSelect }: CalendarPickerProps) {
  const todayKey = sastTodayKey();
  const [todayY, todayM1] = todayKey.split("-").map(Number);

  const availableKeys = useMemo(() => new Set(Object.keys(availability)), [availability]);
  const lastAvailableKey = useMemo(() => {
    let last: string | null = null;
    let lastTime = -Infinity;
    for (const key of availableKeys) {
      const [y, m, d] = key.split("-").map(Number);
      const t = Date.UTC(y, m - 1, d);
      if (t > lastTime) {
        lastTime = t;
        last = key;
      }
    }
    return last;
  }, [availableKeys]);

  const [viewYear, setViewYear] = useState(todayY);
  const [viewMonth0, setViewMonth0] = useState(todayM1 - 1);
  const [selectedDayKey, setSelectedDayKey] = useState<string | null>(
    selectedSlot ? availabilityKeyForSlot(selectedSlot) : null
  );

  const firstOfMonth = new Date(Date.UTC(viewYear, viewMonth0, 1));
  const startOffset = firstOfMonth.getUTCDay();
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth0 + 1, 0)).getUTCDate();
  const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

  const cells: Array<{ day: number | null; key: string | null }> = [];
  for (let i = 0; i < totalCells; i++) {
    const dayNum = i - startOffset + 1;
    if (dayNum < 1 || dayNum > daysInMonth) {
      cells.push({ day: null, key: null });
    } else {
      const key = ymdKey(viewYear, viewMonth0 + 1, dayNum);
      cells.push({ day: dayNum, key });
    }
  }

  const canPrev = !(viewYear === todayY && viewMonth0 === todayM1 - 1);
  const canNext = (() => {
    if (!lastAvailableKey) return false;
    const [ly, lm] = lastAvailableKey.split("-").map(Number);
    return viewYear < ly || (viewYear === ly && viewMonth0 < lm - 1);
  })();

  function handleDayClick(key: string | null) {
    if (!key || !availableKeys.has(key)) return;
    setSelectedDayKey(key);
    onSelect(null);
  }

  function handleSlotClick(slot: ContactAvailabilitySlot) {
    onSelect(slot);
  }

  const slotsForSelectedDay = selectedDayKey ? availability[selectedDayKey] ?? [] : [];

  return (
    <div className="bg-white border border-ink/15 rounded-xl p-4 sm:p-5">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-5">
        {/* Month grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <p className="font-display text-base text-ink">{monthLabel(viewYear, viewMonth0)}</p>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => {
                  if (!canPrev) return;
                  if (viewMonth0 === 0) {
                    setViewYear((y) => y - 1);
                    setViewMonth0(11);
                  } else {
                    setViewMonth0((m) => m - 1);
                  }
                }}
                disabled={!canPrev}
                aria-label="Previous month"
                className="w-7 h-7 rounded-md flex items-center justify-center text-ink-500 hover:bg-ink/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={() => {
                  if (!canNext) return;
                  if (viewMonth0 === 11) {
                    setViewYear((y) => y + 1);
                    setViewMonth0(0);
                  } else {
                    setViewMonth0((m) => m + 1);
                  }
                }}
                disabled={!canNext}
                aria-label="Next month"
                className="w-7 h-7 rounded-md flex items-center justify-center text-ink-500 hover:bg-ink/5 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ›
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-1">
            {DAY_LABELS.map((d) => (
              <div key={d} className="text-center text-[10px] uppercase tracking-wider text-ink-400 py-1">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((cell, i) => {
              if (cell.day === null) return <div key={i} className="aspect-square" />;
              const isAvailable = cell.key !== null && availableKeys.has(cell.key);
              const isToday = cell.key === todayKey;
              const isSelected = cell.key === selectedDayKey;
              const base = "aspect-square flex items-center justify-center text-sm rounded-md transition-colors";
              if (isSelected) {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDayClick(cell.key)}
                    className={`${base} bg-ember text-paper font-medium`}
                  >
                    {cell.day}
                  </button>
                );
              }
              if (isAvailable) {
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => handleDayClick(cell.key)}
                    className={`${base} text-ink hover:bg-ember/10 ${isToday ? "ring-1 ring-ember/40" : ""}`}
                  >
                    {cell.day}
                  </button>
                );
              }
              return (
                <div key={i} className={`${base} text-ink-400/50 cursor-not-allowed ${isToday ? "ring-1 ring-ink/10" : ""}`}>
                  {cell.day}
                </div>
              );
            })}
          </div>
        </div>

        {/* Time slots */}
        <div className="md:border-l md:border-ink/10 md:pl-5">
          {!selectedDayKey ? (
            <p className="text-sm text-ink-400">Pick a day to see times.</p>
          ) : slotsForSelectedDay.length === 0 ? (
            <p className="text-sm text-ink-400">No times left on this day.</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">
              {slotsForSelectedDay.map((slot) => {
                const isSelected = selectedSlot?.start === slot.start;
                return (
                  <button
                    key={slot.start}
                    type="button"
                    onClick={() => handleSlotClick(slot)}
                    className={`text-sm py-2.5 px-3 rounded-lg border transition-colors ${
                      isSelected
                        ? "bg-ember text-paper border-ember"
                        : "bg-white text-ink border-ink/15 hover:border-ember/60"
                    }`}
                  >
                    {timeLabel(slot.start)}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <p className="text-xs text-ink-400 mt-4">15-minute Google Meet, Africa/Johannesburg time.</p>
    </div>
  );
}

function availabilityKeyForSlot(slot: ContactAvailabilitySlot): string {
  const d = new Date(slot.start);
  const shifted = new Date(d.getTime() + 120 * 60_000);
  return `${shifted.getUTCFullYear()}-${shifted.getUTCMonth() + 1}-${shifted.getUTCDate()}`;
}
```

- [ ] **Step 2: Lint check**

Run: `cd ~/qwikly-site && npm run lint`
Expected: No errors in the new file.

---

## Task 4: bookSetupCall server action

**Files:**
- Modify: `src/app/(landing)/contact/actions.ts`

- [ ] **Step 1: Add the new action and types**

Replace the current `actions.ts` with:

```typescript
"use server";

import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  resend,
  FROM,
  contactFormHostNotificationHtml,
  contactFormVisitorAckHtml,
} from "@/lib/resend";
import { bookMeeting } from "@/lib/booking-create";

const QWIKLY_OWN_CLIENT_ID = process.env.QWIKLY_OWNER_CLIENT_ID ?? "1";
const SETUP_CALL_SUBJECT = "Book a setup call";

const schema = z.object({
  name: z.string().min(2, "Name required").max(100),
  email: z.string().email("Valid email required"),
  phone: z.string().max(20).optional(),
  subject: z.string().min(2, "Subject required").max(200),
  message: z.string().min(10, "Message too short").max(3000),
});

export type ContactFormState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  setupCallTriggered?: boolean;
  sentToEmail?: string;
  bookedLabel?: string;
};

export async function submitContactForm(
  _prev: ContactFormState,
  formData: FormData
): Promise<ContactFormState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    subject: formData.get("subject"),
    message: formData.get("message"),
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, phone, subject, message } = parsed.data;

  const db = supabaseAdmin();
  const { error: dbError } = await db
    .from("support_messages")
    .insert({ name, email, phone: phone ?? null, subject, message });

  if (dbError) {
    console.error("support_messages insert error:", dbError);
    return { success: false, error: "Could not save message. Please try emailing us directly." };
  }

  await resend.emails.send({
    from: "Qwikly Contact <hello@qwikly.co.za>",
    to: ["clarkeagency1@outlook.com"],
    replyTo: email,
    subject: `[Qwikly Contact] ${subject}`,
    html: contactFormHostNotificationHtml({ name, email, phone: phone ?? null, subject, message }),
  });

  try {
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: `We got your message, ${name.split(" ")[0]}`,
      html: contactFormVisitorAckHtml({ visitorName: name, subject, message }),
    });
  } catch (err) {
    console.error("[contact] visitor ack send failed:", err);
  }

  return { success: true, sentToEmail: email };
}

const setupCallSchema = z.object({
  name: z.string().min(2, "Name required").max(100),
  email: z.string().email("Valid email required"),
  phone: z.string().max(20).optional(),
  slot_start: z.string().datetime({ offset: true }),
  slot_end: z.string().datetime({ offset: true }),
});

export type SetupCallState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
  revertToTextarea?: boolean;
  retry?: boolean;
  setupCallTriggered?: boolean;
  sentToEmail?: string;
  bookedLabel?: string;
};

export async function bookSetupCall(
  _prev: SetupCallState,
  formData: FormData
): Promise<SetupCallState> {
  const raw = {
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") || undefined,
    slot_start: formData.get("slot_start"),
    slot_end: formData.get("slot_end"),
  };

  const parsed = setupCallSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, phone, slot_start, slot_end } = parsed.data;

  const db = supabaseAdmin();
  const { error: dbError } = await db.from("support_messages").insert({
    name,
    email,
    phone: phone ?? null,
    subject: SETUP_CALL_SUBJECT,
    message: `Slot booked via /contact picker: ${slot_start} → ${slot_end}`,
  });
  if (dbError) {
    console.error("[bookSetupCall] support_messages insert error:", dbError);
  }

  const result = await bookMeeting({
    clientId: QWIKLY_OWN_CLIENT_ID,
    visitorName: name,
    visitorEmail: email,
    visitorPhone: phone ?? null,
    start: slot_start,
    end: slot_end,
    notes: "Booked via /contact setup-call picker.",
    conversationId: null,
  });

  if (!result.ok) {
    if (result.reason === "slot_taken") {
      return {
        success: false,
        error: "That slot was just taken — pick another time.",
        retry: true,
      };
    }
    if (result.reason === "calendar_not_connected" || result.reason === "calendar_disconnected") {
      return {
        success: false,
        error: "Live calendar is offline right now — drop us a note instead.",
        revertToTextarea: true,
      };
    }
    return {
      success: false,
      error: "Couldn't lock that in. Try another time, or send a note instead.",
    };
  }

  return {
    success: true,
    setupCallTriggered: true,
    sentToEmail: email,
    bookedLabel: result.label,
  };
}
```

- [ ] **Step 2: Lint check**

Run: `cd ~/qwikly-site && npm run lint`
Expected: No new errors.

---

## Task 5: Wire ContactForm to picker + new action

**Files:**
- Modify: `src/app/(landing)/contact/ContactForm.tsx`

- [ ] **Step 1: Replace the file with the picker-aware version**

Full replacement:

```typescript
"use client";

import { useEffect, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import {
  submitContactForm,
  bookSetupCall,
  type ContactFormState,
  type SetupCallState,
} from "./actions";
import CalendarPicker from "./CalendarPicker";
import { useAvailability } from "./useAvailability";
import type { ContactAvailabilitySlot } from "@/app/api/web/contact-availability/route";

const SETUP_CALL_SUBJECT = "Book a setup call";

const SUBJECTS = [
  SETUP_CALL_SUBJECT,
  "Pricing question",
  "Technical issue",
  "Billing enquiry",
  "Partnership",
  "Other",
];

const messageInitial: ContactFormState = { success: false };
const setupInitial: SetupCallState = { success: false };

function MessageSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full sm:w-auto px-8 py-3 bg-ember text-paper rounded-xl font-medium text-sm hover:bg-ember/90 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Sending…" : "Send message"}
    </button>
  );
}

function SetupSubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending || disabled}
      className="w-full sm:w-auto px-8 py-3 bg-ember text-paper rounded-xl font-medium text-sm hover:bg-ember/90 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? "Booking…" : "Book setup call"}
    </button>
  );
}

export default function ContactForm() {
  const [subject, setSubject] = useState("");
  const isSetupCall = subject === SETUP_CALL_SUBJECT;
  const [forceTextarea, setForceTextarea] = useState(false);
  const showPicker = isSetupCall && !forceTextarea;

  const [messageState, messageAction] = useFormState(submitContactForm, messageInitial);
  const [setupState, setupAction] = useFormState(bookSetupCall, setupInitial);

  const availability = useAvailability(showPicker);
  const [selectedSlot, setSelectedSlot] = useState<ContactAvailabilitySlot | null>(null);

  useEffect(() => {
    if (!isSetupCall) {
      setSelectedSlot(null);
      setForceTextarea(false);
    }
  }, [isSetupCall]);

  useEffect(() => {
    if (setupState.revertToTextarea) {
      setForceTextarea(true);
    }
    if (setupState.retry) {
      availability.refetch();
      setSelectedSlot(null);
    }
  }, [setupState.revertToTextarea, setupState.retry, availability]);

  const successState = messageState.success ? messageState : setupState.success ? setupState : null;

  if (successState) {
    const wasBooking = "bookedLabel" in successState && !!successState.bookedLabel;
    return (
      <div className="bg-paper-deep border border-ink/[0.07] rounded-2xl p-8 text-center">
        <div className="w-10 h-10 bg-ember/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-5 h-5 text-ember"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden="true"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-display text-xl text-ink mb-2">
          {wasBooking ? "You're booked in" : "Message sent"}
        </h3>
        <p className="text-ink-500 text-sm leading-relaxed">
          {wasBooking ? (
            <>
              We&rsquo;ve locked in <span className="text-ink font-medium">{successState.bookedLabel}</span>. The Google Meet invite has just been sent to <span className="text-ink font-medium">{successState.sentToEmail}</span>.
            </>
          ) : (
            <>
              A confirmation has been sent to <span className="text-ink font-medium">{successState.sentToEmail}</span>. We&rsquo;ll get back to you within one business day.
            </>
          )}
        </p>
        <p className="text-ink-400 text-xs mt-3">
          Don&rsquo;t see it? Check your <span className="text-ink-500 font-medium">spam or junk folder</span> in case it got filtered.
        </p>
      </div>
    );
  }

  const action = showPicker ? setupAction : messageAction;
  const errorMsg = showPicker ? setupState.error : messageState.error;
  const fieldErrors = showPicker ? setupState.fieldErrors : messageState.fieldErrors;

  return (
    <form action={action} className="space-y-5">
      {errorMsg && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label htmlFor="name" className="eyebrow text-ink-500 mb-2 block">
            Name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            className="w-full px-4 py-3 bg-white border border-ink/15 rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember/40 transition-all placeholder:text-ink-400"
            placeholder="Your name"
          />
          {fieldErrors?.name && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.name[0]}</p>
          )}
        </div>

        <div>
          <label htmlFor="email" className="eyebrow text-ink-500 mb-2 block">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            className="w-full px-4 py-3 bg-white border border-ink/15 rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember/40 transition-all placeholder:text-ink-400"
            placeholder="you@example.com"
          />
          {fieldErrors?.email && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.email[0]}</p>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="phone" className="eyebrow text-ink-500 mb-2 block">
          Phone <span className="normal-case font-normal text-ink-400">(optional)</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          autoComplete="tel"
          className="w-full px-4 py-3 bg-white border border-ink/15 rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember/40 transition-all placeholder:text-ink-400"
          placeholder="+27 XX XXX XXXX"
        />
      </div>

      <div>
        <label htmlFor="subject" className="eyebrow text-ink-500 mb-2 block">
          Subject
        </label>
        <select
          id="subject"
          name="subject"
          required
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full px-4 py-3 bg-white border border-ink/15 rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember/40 transition-all cursor-pointer appearance-none"
        >
          <option value="">Select a topic</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {fieldErrors?.subject && (
          <p className="mt-1 text-xs text-red-600">{fieldErrors.subject[0]}</p>
        )}
      </div>

      {showPicker ? (
        <div>
          <label className="eyebrow text-ink-500 mb-2 block">Pick a time</label>
          {availability.loading && (
            <div className="bg-white border border-ink/15 rounded-xl p-6 text-sm text-ink-400">
              Loading times…
            </div>
          )}
          {!availability.loading && availability.reason && availability.reason !== "empty" && (
            <div className="bg-white border border-ink/15 rounded-xl p-6 text-sm text-ink-500">
              Live calendar is offline right now.{" "}
              <button
                type="button"
                onClick={() => setForceTextarea(true)}
                className="text-ember underline"
              >
                Drop us a note instead
              </button>
              .
            </div>
          )}
          {!availability.loading && availability.reason === "empty" && (
            <div className="bg-white border border-ink/15 rounded-xl p-6 text-sm text-ink-500">
              No slots in the next 30 days.{" "}
              <button
                type="button"
                onClick={() => setForceTextarea(true)}
                className="text-ember underline"
              >
                Drop us a note instead
              </button>
              .
            </div>
          )}
          {!availability.loading && !availability.reason && availability.availability && (
            <CalendarPicker
              availability={availability.availability}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
            />
          )}
          {selectedSlot && (
            <>
              <input type="hidden" name="slot_start" value={selectedSlot.start} />
              <input type="hidden" name="slot_end" value={selectedSlot.end} />
            </>
          )}
        </div>
      ) : (
        <div>
          <label htmlFor="message" className="eyebrow text-ink-500 mb-2 block">
            Message
          </label>
          <textarea
            id="message"
            name="message"
            required
            rows={5}
            className="w-full px-4 py-3 bg-white border border-ink/15 rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember/40 transition-all placeholder:text-ink-400 resize-none"
            placeholder="What can we help you with?"
          />
          {fieldErrors?.message && (
            <p className="mt-1 text-xs text-red-600">{fieldErrors.message[0]}</p>
          )}
        </div>
      )}

      {showPicker ? (
        <SetupSubmitButton disabled={!selectedSlot} />
      ) : (
        <MessageSubmitButton />
      )}
    </form>
  );
}
```

- [ ] **Step 2: Lint check**

Run: `cd ~/qwikly-site && npm run lint`
Expected: No new errors.

- [ ] **Step 3: Build check (Next.js typecheck)**

Run: `cd ~/qwikly-site && npm run build`
Expected: Build completes without TS errors. (Build may take ~60s.)

---

## Task 6: Manual smoke test

- [ ] **Step 1: Start dev server**

Run: `cd ~/qwikly-site && npm run dev` (in background)

- [ ] **Step 2: Open `/contact` and walk through the flow**

In a browser:
1. Default state: Subject = "Select a topic", message textarea visible.
2. Pick `Pricing question` → textarea stays, button reads "Send message".
3. Pick `Book a setup call` → textarea is replaced by the calendar picker. Button reads "Book setup call" and is disabled.
4. Pick a day in the picker → time pills appear on the right.
5. Pick a time → "Book setup call" button becomes enabled.
6. Click `Book setup call` (with a real test name + your own email) → success card with "You're booked in" + "Check your spam or junk folder".
7. Verify the event appears in Liam's Google Calendar with a Meet link.
8. Switch back to `Pricing question` → textarea returns, button is "Send message".

If the calendar isn't connected in the local env, expect the "Live calendar is offline right now — drop us a note instead." fallback. Click the "Drop us a note instead" link and verify the textarea returns.

---

## Task 7: Commit + push + deploy

- [ ] **Step 1: Stage and commit the feature**

```bash
cd ~/qwikly-site
git add src/app/api/web/contact-availability/route.ts \
  src/app/\(landing\)/contact/CalendarPicker.tsx \
  src/app/\(landing\)/contact/useAvailability.ts \
  src/app/\(landing\)/contact/actions.ts \
  src/app/\(landing\)/contact/ContactForm.tsx \
  docs/superpowers/plans/2026-05-08-contact-page-inline-calendar-picker.md
git commit -m "feat(contact): inline calendar picker for setup-call subject

When a visitor picks 'Book a setup call' on /contact, the message
textarea is replaced by a Cal.com-style date+time picker driven by
the existing getAvailableSlots() against Liam's Google Calendar.
Confirming the slot calls bookMeeting() on the spot, creates the
Calendar event, sends the Google Meet invite by email, and shows
a 'check your spam/junk folder' success card.

Removes the previous email-three-slots branch from
submitContactForm; the inline picker fully replaces it. The
token-based /book/[token] flow is untouched."
```

- [ ] **Step 2: Push to origin**

```bash
cd ~/qwikly-site && git push origin main
```

- [ ] **Step 3: Verify Vercel deployment**

Run: `cd ~/qwikly-site && vercel ls --yes 2>/dev/null | head -5` to see the latest deployment status, or open the Vercel dashboard.
Expected: Latest deployment is `Ready`. If it fails, read the build log and fix.
