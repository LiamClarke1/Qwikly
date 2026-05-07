"use client";

import { useEffect, useState } from "react";
import { X, FileText, CalendarDays, Mail, Check, ArrowRight, Building2 } from "lucide-react";

export type ManualPaymentPlan = "pro" | "premium";

interface ManualPaymentModalProps {
  open: boolean;
  plan: ManualPaymentPlan;
  cycle?: "monthly" | "annual";
  onClose: () => void;
}

const PLAN_PRICE: Record<ManualPaymentPlan, { monthly: number; annual: number; name: string }> = {
  pro:     { monthly: 999,  annual: 10188, name: "Pro" },
  premium: { monthly: 1999, annual: 20390, name: "Premium" },
};

const SUPPORT_EMAIL = "hello@qwikly.co.za";
const BOOK_HREF = "/contact";

type PanelKey = "invoice" | "call" | "email" | null;

export default function ManualPaymentModal({ open, plan, cycle = "monthly", onClose }: ManualPaymentModalProps) {
  const [panel, setPanel] = useState<PanelKey>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  useEffect(() => { if (!open) setPanel(null); }, [open]);

  if (!open) return null;

  const meta = PLAN_PRICE[plan];
  const price = cycle === "annual" ? Math.round(meta.annual / 12) : meta.monthly;
  const billed = cycle === "annual" ? `Billed R${meta.annual.toLocaleString()}/year` : "Billed monthly";
  const subjectLine = encodeURIComponent(`Qwikly ${meta.name} plan, sign-up`);
  const bodyLine = encodeURIComponent(
    `Hi Qwikly team,\n\nI'd like to sign up for the ${meta.name} plan (${cycle}).\n\nBusiness name:\nWebsite:\nContact name:\n\nThanks!`,
  );
  const mailHref = `mailto:${SUPPORT_EMAIL}?subject=${subjectLine}&body=${bodyLine}`;

  return (
    <div
      className="fixed inset-0 z-[100] bg-ink/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="manual-payment-title"
      onClick={onClose}
    >
      <div
        className="bg-paper border border-ink/[0.08] rounded-3xl w-full max-w-2xl shadow-[0_24px_60px_-20px_rgba(0,0,0,0.25)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-7 pt-7 pb-5 border-b border-ink/[0.06] flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow text-ember mb-2">Sign up, {meta.name}</p>
            <h3 id="manual-payment-title" className="font-display text-2xl text-ink leading-tight">
              Choose how to get started.
            </h3>
            <p className="text-sm text-ink-700 mt-2">
              <span className="font-display text-ink">R{price.toLocaleString()}</span>
              <span className="text-ink-500">/mo · {billed}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full border border-ink/10 hover:border-ink/30 flex items-center justify-center text-ink-500 hover:text-ink cursor-pointer transition-colors duration-200 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Options */}
        <div className="p-5 sm:p-7 space-y-3">
          {/* Option 1: Invoice details */}
          <OptionRow
            icon={<FileText className="w-4 h-4 text-ember" strokeWidth={2} />}
            title="Pay by monthly invoice"
            blurb="We email you an invoice each month. Pay by EFT into our account, no card needed."
            isOpen={panel === "invoice"}
            onClick={() => setPanel(panel === "invoice" ? null : "invoice")}
          >
            <div className="space-y-3 text-sm text-ink-700 leading-relaxed">
              <p>Here&apos;s how it works:</p>
              <ul className="space-y-2.5">
                {[
                  "We send your first invoice once your account is set up.",
                  "Pay by EFT to our South African business account, bank details are on every invoice.",
                  "Invoices land in your inbox on the same day every month.",
                  "Cancel any time, no lock-in. Stop paying, account pauses.",
                ].map((line) => (
                  <li key={line} className="flex items-start gap-2.5">
                    <span className="w-4 h-4 mt-0.5 rounded-full bg-ember/12 flex items-center justify-center shrink-0">
                      <Check className="w-2.5 h-2.5 text-ember" strokeWidth={3} />
                    </span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
              <div className="rounded-xl bg-ink/[0.03] border border-ink/[0.06] p-4 mt-4">
                <p className="eyebrow text-ink-500 mb-2">To get your first invoice</p>
                <p className="text-ink-700">
                  Email us at{" "}
                  <a href={mailHref} className="text-ember hover:text-ember-deep underline underline-offset-2 font-medium">
                    {SUPPORT_EMAIL}
                  </a>{" "}
                  with your business name and website, and we&apos;ll send the invoice within one business day.
                </p>
              </div>
            </div>
          </OptionRow>

          {/* Option 2: Book a call */}
          <OptionRow
            icon={<CalendarDays className="w-4 h-4 text-ember" strokeWidth={2} />}
            title="Book a 10-minute setup call"
            blurb="Quick walk-through, we confirm your plan and start your invoice."
            href={BOOK_HREF}
          />

          {/* Option 3: Email */}
          <OptionRow
            icon={<Mail className="w-4 h-4 text-ember" strokeWidth={2} />}
            title={`Email ${SUPPORT_EMAIL}`}
            blurb="Tell us which plan you want, we'll reply with your invoice and setup steps."
            href={mailHref}
            external
          />
        </div>

        {/* Footer, powered by Clarke Agency */}
        <div className="px-7 py-4 border-t border-ink/[0.06] bg-paper-deep flex items-center justify-between gap-3 flex-wrap">
          <p className="text-tiny text-ink-500 flex items-center gap-1.5">
            <Building2 className="w-3.5 h-3.5 text-ink-400" strokeWidth={1.75} aria-hidden="true" />
            Billing handled by Clarke Agency, on behalf of Qwikly.
          </p>
          <p className="text-tiny text-ink-400">POPIA compliant · ZAR pricing</p>
        </div>
      </div>
    </div>
  );
}

interface OptionRowProps {
  icon: React.ReactNode;
  title: string;
  blurb: string;
  href?: string;
  external?: boolean;
  isOpen?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

function OptionRow({ icon, title, blurb, href, external, isOpen, onClick, children }: OptionRowProps) {
  const baseClasses =
    "w-full text-left rounded-2xl border border-ink/[0.08] hover:border-ember/40 bg-white p-5 transition-colors duration-200 cursor-pointer flex items-start gap-4 group";

  const inner = (
    <>
      <span className="w-9 h-9 rounded-full bg-ember/10 flex items-center justify-center shrink-0">
        {icon}
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-display text-base text-ink mb-1">{title}</p>
        <p className="text-sm text-ink-600 leading-relaxed">{blurb}</p>
      </div>
      <ArrowRight
        className={`w-4 h-4 text-ink-400 group-hover:text-ember mt-3 shrink-0 transition-transform duration-200 ${
          isOpen ? "rotate-90" : ""
        }`}
        strokeWidth={2}
      />
    </>
  );

  if (href) {
    if (external) {
      return (
        <a href={href} className={baseClasses} target="_blank" rel="noopener noreferrer">
          {inner}
        </a>
      );
    }
    return (
      <a href={href} className={baseClasses}>
        {inner}
      </a>
    );
  }

  return (
    <div>
      <button type="button" onClick={onClick} className={baseClasses} aria-expanded={isOpen}>
        {inner}
      </button>
      {isOpen && children && (
        <div className="mt-2 rounded-2xl border border-ember/20 bg-ember/[0.03] p-5 animate-fade-in">
          {children}
        </div>
      )}
    </div>
  );
}
