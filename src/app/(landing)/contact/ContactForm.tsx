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

  const successState = messageState.success
    ? messageState
    : setupState.success
      ? setupState
      : null;

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
              We&rsquo;ve locked in{" "}
              <span className="text-ink font-medium">{successState.bookedLabel}</span>. The
              Google Meet invite has just been sent to{" "}
              <span className="text-ink font-medium">{successState.sentToEmail}</span>.
            </>
          ) : (
            <>
              A confirmation has been sent to{" "}
              <span className="text-ink font-medium">{successState.sentToEmail}</span>. We&rsquo;ll
              get back to you within one business day.
            </>
          )}
        </p>
        <p className="text-ink-400 text-xs mt-3">
          Don&rsquo;t see it? Check your{" "}
          <span className="text-ink-500 font-medium">spam or junk folder</span> in case it got
          filtered.
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
          {!availability.loading &&
            availability.reason &&
            availability.reason !== "empty" && (
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
          {!availability.loading &&
            !availability.reason &&
            availability.availability && (
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
