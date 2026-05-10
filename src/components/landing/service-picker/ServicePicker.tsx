"use client";

/* ─────────────────────────────────────────────────────────────
   SERVICE PICKER
   Pill-style picker used on /contact (and reusable elsewhere)
   to ask which Qwikly service the visitor wants to talk about.
   ───────────────────────────────────────────────────────────── */

export type ServiceInterest = "Digital Assistant" | "Pipeline" | "Both / not sure";

export const SERVICE_INTEREST_OPTIONS: ServiceInterest[] = [
  "Digital Assistant",
  "Pipeline",
  "Both / not sure",
];

export const DEFAULT_SERVICE_INTEREST: ServiceInterest = "Both / not sure";

type Props = {
  value: ServiceInterest;
  onChange: (value: ServiceInterest) => void;
  /** Optional name for the hidden field that gets posted with the form. */
  name?: string;
  /** Optional eyebrow / label override. */
  label?: string;
  /** Optional helper text under the picker. */
  helper?: string;
};

export default function ServicePicker({
  value,
  onChange,
  name = "service_interest",
  label = "Which service?",
  helper = "Tell us where to route you. You can change this in the message below.",
}: Props) {
  return (
    <div>
      <p className="eyebrow text-ink-500 mb-2 block">{label}</p>
      <div
        role="radiogroup"
        aria-label={label}
        className="flex flex-wrap gap-2"
      >
        {SERVICE_INTEREST_OPTIONS.map((opt) => {
          const active = value === opt;
          return (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt)}
              className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-all duration-200 cursor-pointer ${
                active
                  ? "bg-ember text-paper border-ember shadow-sm"
                  : "bg-white text-ink border-ink/15 hover:border-ember/50 hover:bg-paper-deep"
              }`}
            >
              {opt}
            </button>
          );
        })}
      </div>
      {helper && (
        <p className="mt-2 text-xs text-ink-500 leading-relaxed">{helper}</p>
      )}
      {/* Hidden field so it persists into the form submission. */}
      <input type="hidden" name={name} value={value} />
    </div>
  );
}
