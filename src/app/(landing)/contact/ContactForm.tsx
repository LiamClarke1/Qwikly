"use client";

import { useFormState, useFormStatus } from "react-dom";
import { submitContactForm, type ContactFormState } from "./actions";

const SUBJECTS = [
  "Pricing question",
  "Setup help",
  "Technical issue",
  "Billing enquiry",
  "Partnership",
  "Other",
];

const initial: ContactFormState = { success: false };

function SubmitButton() {
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

export default function ContactForm() {
  const [state, action] = useFormState(submitContactForm, initial);

  if (state.success) {
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
        <h3 className="font-display text-xl text-ink mb-2">Message sent</h3>
        <p className="text-ink-500 text-sm">
          We&rsquo;ll get back to you within one business day at the email you provided.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-5">
      {state.error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">
          {state.error}
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
          {state.fieldErrors?.name && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.name[0]}</p>
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
          {state.fieldErrors?.email && (
            <p className="mt-1 text-xs text-red-600">{state.fieldErrors.email[0]}</p>
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
          className="w-full px-4 py-3 bg-white border border-ink/15 rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember/40 transition-all cursor-pointer appearance-none"
        >
          <option value="">Select a topic</option>
          {SUBJECTS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        {state.fieldErrors?.subject && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.subject[0]}</p>
        )}
      </div>

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
        {state.fieldErrors?.message && (
          <p className="mt-1 text-xs text-red-600">{state.fieldErrors.message[0]}</p>
        )}
      </div>

      <SubmitButton />
    </form>
  );
}
