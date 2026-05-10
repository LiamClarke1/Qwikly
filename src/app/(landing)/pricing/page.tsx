"use client";

import { useState } from "react";
import { Check, Minus, Plus, Shield, MapPin, Clock, Zap, TrendingDown, MessageSquare, Phone, X, Sparkles } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import ManualPaymentModal, { type ManualPaymentPlan } from "@/components/ManualPaymentModal";
import { RevenueCalculator } from "@/components/landing/RevenueCalculator";
import { LiveCounter } from "@/components/landing/LiveCounter";
import { CaseStudyCard } from "@/components/pricing/CaseStudyCard";
import { NicheChips } from "@/components/pricing/NicheChips";
import { ServiceTabs, type ServiceTab } from "@/components/pricing/ServiceTabs";
import { PipelinePricingBlock } from "@/components/pricing/PipelinePricingBlock";

// Tier pricing. Annual = monthly x 12 x 0.85 (15% off, rounded).
const MONTHLY = { starter: 699, pro: 1799, founders: 2999, business: 3999, enterprise: 7999 } as const;
const ANNUAL  = { starter: 7128, pro: 18350, founders: 30590, business: 40790, enterprise: 81590 } as const;

type TierId = keyof typeof MONTHLY;

const tiers: {
  id: TierId;
  name: string;
  tagline: string;
  features: string[];
  instantReply: { included: boolean; addOnPrice?: number };
  highlight: boolean;
  pill?: { label: string; variant: "popular" | "handsoff" };
  cta: string;
}[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Solo trades, individual agents, sole practitioners",
    highlight: false,
    cta: "Start with Starter",
    instantReply: { included: false, addOnPrice: 499 },
    features: [
      "30 qualified leads/month",
      "1 dashboard user",
      "Digital assistant on your website",
      "Email lead delivery",
      '"Powered by Qwikly" branding',
      "Email support, 24h response",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Small multi-person practices and teams",
    highlight: true,
    pill: { label: "Most Popular", variant: "popular" },
    cta: "Start with Pro",
    instantReply: { included: true },
    features: [
      "100 qualified leads/month",
      "3 dashboard users",
      "Custom branding, your logo and colours",
      "Custom greeting + qualifying questions",
      "Email support, 12h response",
      "Annual billing saves 15%",
    ],
  },
  {
    id: "founders",
    name: "Founders Concierge",
    tagline: "Pro plan, plus a real person handling every lead for you",
    highlight: false,
    pill: { label: "Hands-off", variant: "handsoff" },
    cta: "Talk to us",
    instantReply: { included: true },
    features: [
      "Everything in Pro",
      "Real human responding to every lead in under 60 seconds, business hours",
      "We book the call into your calendar",
      "We send the calendar invite to your customer",
      "You only see qualified, booked appointments",
      "Limited spots, capacity capped per region",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Multi-doctor, multi-agent, busy practices",
    highlight: false,
    cta: "Start with Business",
    instantReply: { included: true },
    features: [
      "400 qualified leads/month",
      "Unlimited dashboard users",
      "Custom branding (your logo, no Qwikly footer)",
      "Lead exports (CSV)",
      "Priority email support, 4h response",
      "Everything in Pro",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-location, white-label, mission-critical",
    highlight: false,
    cta: "Talk to us",
    instantReply: { included: true },
    features: [
      "1,500+ qualified leads/month",
      "Full white-label, your domain",
      "API access for custom integrations",
      "Dedicated support, 1h SLA",
      "Custom onboarding",
      "Volume pricing on request",
    ],
  },
];

type FeatureCell = boolean | string;

const featureRows: { label: string; starter: FeatureCell; pro: FeatureCell; business: FeatureCell; enterprise: FeatureCell }[] = [
  { label: "Digital assistant on your website",   starter: true,    pro: true,    business: true,     enterprise: true     },
  { label: "Email lead delivery",                  starter: true,    pro: true,    business: true,     enterprise: true     },
  { label: "POPIA compliant",                      starter: true,    pro: true,    business: true,     enterprise: true     },
  { label: "Qualified leads / month",              starter: "30",    pro: "100",   business: "400",    enterprise: "1,500+" },
  { label: "Top-up rate beyond plan",              starter: "R23 / lead", pro: "R20 / lead", business: "R12 / lead", enterprise: "Volume" },
  { label: "Instant Reply 60s, WhatsApp + SMS",    starter: "Add-on R499/mo",   pro: true,    business: true,     enterprise: true     },
  { label: "Dashboard users",                      starter: "1",     pro: "3",     business: "Unlimited", enterprise: "Unlimited" },
  { label: "Custom greeting & questions",          starter: false,   pro: true,    business: true,     enterprise: true     },
  { label: '"Powered by Qwikly" branding',         starter: true,    pro: false,   business: false,    enterprise: false    },
  { label: "Custom branding (your logo)",          starter: false,   pro: true,    business: true,     enterprise: true     },
  { label: "Lead exports (CSV)",                   starter: false,   pro: false,   business: true,     enterprise: true     },
  { label: "API access",                           starter: false,   pro: false,   business: false,    enterprise: true     },
  { label: "Support response SLA",                 starter: "24h",   pro: "12h",   business: "4h",     enterprise: "1h"     },
];

const pricingFAQs = [
  {
    question: "What happens if I do not book any jobs?",
    answer:
      "If Qwikly does not book you a paying job in your first 30 days, your second month is free. We track every lead the system delivers to your inbox, every booked call, and every job invoiced through it, so we know whether the system worked for you. The guarantee is automatic, you do not have to ask.",
  },
  {
    question: "How fast does Qwikly respond to a new lead?",
    answer:
      "Under 60 seconds, every time. The system replies on your website chat, and on Pro and above we also push the lead to the owner by WhatsApp and SMS the same minute. You can call them back while they are still on your website, which is the single biggest reason Qwikly clients close more jobs.",
  },
  {
    question: "Do you handle the response, or do I?",
    answer:
      "Your call. On Starter, Pro, Business and Enterprise, the digital assistant captures and qualifies the lead and sends it to you, you make the call. On Founders Concierge, a real person on our team responds inside 60 seconds during business hours, qualifies the job, books the call into your calendar, and sends the customer a calendar invite. You only see appointments, not raw leads.",
  },
  {
    question: "What counts as a qualified lead?",
    answer:
      "A lead is counted only when a visitor shares their phone number or email address. Someone who opens the chat, says hi, or gives only their name does not count. Bounced chats, bots, and your own test messages never count. You only pay for people you can actually reach.",
  },
  {
    question: "What happens when I hit my monthly limit?",
    answer:
      "We'll notify you before you hit the cap. You can upgrade your plan, or top up extra leads at your plan's per-lead rate (R23 on Starter, R20 on Pro, R12 on Business, close to what you're already paying inside your plan, never a flat overage). No automatic billing, no surprise charges, and your digital assistant keeps working until you decide.",
  },
  {
    question: "What happens after my 7-day trial?",
    answer:
      "At the end of your trial, you choose a paid plan to continue. If you don't upgrade, your account pauses. You keep your dashboard and all lead history. Upgrade at any time to reactivate.",
  },
  {
    question: "Can I switch plans anytime?",
    answer:
      "Yes. Upgrade or downgrade from your dashboard at any time. Upgrades take effect immediately. Downgrades apply at the start of your next billing period.",
  },
  {
    question: "Do you take a cut of my jobs?",
    answer:
      "Never. Qwikly charges a flat monthly rate only. We earn nothing from your bookings. Every rand you earn stays yours. That's the whole point of flat pricing.",
  },
  {
    question: "How does the pay-per-job add-on work?",
    answer:
      "It is opt-in. When you turn it on, Qwikly invoices R350 once a lead converts to a paid job in your books. Toggle it off any time. Most clients use it as an alignment signal, the price moves with their results.",
  },
  {
    question: "Can I run both services?",
    answer:
      "Yes. Most clients do both eventually. We offer a 10% bundle discount when you run Digital Assistant and Pipeline together.",
  },
  {
    question: "Which service should I start with?",
    answer:
      "If you have website traffic but miss enquiries, start with Digital Assistant. If your problem is a quiet pipeline, start with Pipeline. Most clients start with one and add the other within 90 days.",
  },
  {
    question: "Is Pipeline available outside South Africa?",
    answer:
      "Yes. Pipeline works globally. South African clients pay in ZAR, international clients can request a USD invoice.",
  },
];

function TableCell({ value, isPremiumCol }: { value: FeatureCell; isPremiumCol?: boolean }) {
  if (typeof value === "string") {
    return (
      <span className={`font-display text-lg leading-none ${isPremiumCol ? "text-ember" : "text-ink"}`}>
        {value}
      </span>
    );
  }
  if (value) {
    return (
      <span className="flex items-center justify-center">
        <span className="w-5 h-5 rounded-full bg-ember/12 flex items-center justify-center">
          <Check className="w-3 h-3 text-ember" strokeWidth={2.5} />
        </span>
      </span>
    );
  }
  return (
    <span className="flex items-center justify-center">
      <Minus className="w-4 h-4 text-ink/20" strokeWidth={2} />
    </span>
  );
}

type CompareTab = Exclude<TierId, "founders">;

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [compareTab, setCompareTab] = useState<CompareTab>("pro");
  const [paymentPlan, setPaymentPlan] = useState<ManualPaymentPlan | null>(null);
  const [activeService, setActiveService] = useState<ServiceTab>("digital-assistant");

  function displayPrice(id: TierId) {
    return annual ? Math.round(ANNUAL[id] / 12) : MONTHLY[id];
  }

  return (
    <div className="bg-paper">

      {/* SERVICE TOGGLE, top of page */}
      <section className="relative pt-32 md:pt-36 pb-2 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-4 text-center">Choose a service</p>
          <ServiceTabs active={activeService} onChange={setActiveService} />
          <p className="mt-4 text-center text-xs text-ink-500">
            Two services, one pricing page. Pick which one you want to see, or scroll for both.
          </p>
        </div>
      </section>

      {/* DIGITAL ASSISTANT SECTION WRAPPER */}
      <div id="digital-assistant" className="block scroll-mt-24">

        {/* Section header */}
        <section className="relative pt-10 pb-6 grain overflow-hidden">
          <div className="relative mx-auto max-w-site px-6 lg:px-10">
            <p className="eyebrow text-ember mb-4">Service 1, Digital Assistant</p>
            <h2 className="display-lg text-ink max-w-[22ch]">
              Inbound lead capture,
              <br />
              <em className="italic font-light">R699 to R7,999/mo.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 max-w-2xl leading-relaxed">
              Capture every enquiry on your website and answer it in under 60 seconds.
            </p>
          </div>
        </section>

      {/* HERO */}
      <section className="relative pt-6 pb-12 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">Pricing</p>
          <h1 className="display-xl text-ink max-w-[20ch]">
            Booked jobs in your{" "}
            <em className="italic font-light">inbox</em>, every week.
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-2xl leading-relaxed">
            Qwikly captures every enquiry from your website, qualifies it, and lands it in your inbox in under 60 seconds. If we don&rsquo;t book you a paying job in your first 30 days, your second month is free.
          </p>
          <LiveCounter />
        </div>
      </section>

      {/* REVENUE CALCULATOR */}
      <section className="relative pb-20 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-10 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-4">Your number first</p>
            <h2 className="display-lg text-ink">
              How much are slow replies
              <br />
              <em className="italic font-light">costing you right now?</em>
            </h2>
            <p className="mt-4 text-ink-700 text-base leading-relaxed">
              Before you look at the price, look at the size of the leak. The
              numbers below are an industry estimate, varies by niche.
            </p>
          </div>
          <RevenueCalculator />
        </div>
      </section>

      {/* CASE STUDY */}
      <section className="relative pb-20 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <CaseStudyCard />
        </div>
      </section>

      {/* TOGGLE + TIER CARDS */}
      <section className="relative pb-28 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">

          {/* Monthly / Annual toggle */}
          <div className="flex items-center justify-center gap-4 mb-14 flex-wrap">
            <span
              onClick={() => setAnnual(false)}
              className={`eyebrow cursor-pointer transition-colors duration-200 select-none ${!annual ? "text-ink" : "text-ink-500 hover:text-ink"}`}
            >
              Monthly
            </span>

            <button
              onClick={() => setAnnual((a) => !a)}
              role="switch"
              aria-checked={annual}
              aria-label="Toggle annual billing"
              className={`relative w-14 h-7 rounded-full transition-colors duration-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ember/40 ${annual ? "bg-ember" : "bg-ink/20"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 bg-paper rounded-full shadow-sm transition-transform duration-300 ${annual ? "translate-x-7" : "translate-x-0"}`}
              />
            </button>

            <span
              onClick={() => setAnnual(true)}
              className={`eyebrow cursor-pointer transition-colors duration-200 select-none ${annual ? "text-ink" : "text-ink-500 hover:text-ink"}`}
            >
              Annual
            </span>

            <span
              className={`eyebrow bg-ember text-paper px-3 py-1.5 rounded-full transition-all duration-300 ${annual ? "opacity-100 scale-100" : "opacity-0 scale-90 pointer-events-none"}`}
            >
              Save 15%
            </span>
          </div>

          {/* Free trial banner */}
          <div className="mb-10 flex justify-center">
            <a
              href="/signup?plan=trial"
              className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-ember/10 border border-ember/20 hover:bg-ember/15 transition-colors"
            >
              <span className="w-2 h-2 rounded-full bg-ember" />
              <span className="text-sm text-ink-700">
                <strong className="text-ink">7-day free trial of Starter</strong>, no card required
              </span>
            </a>
          </div>

          {/* Live in 24 hours promise band */}
          <div className="mb-8 max-w-3xl mx-auto">
            <div className="ed-card flex items-start gap-4 border-l-4 border-ember py-4">
              <span className="w-9 h-9 rounded-full bg-ember/10 flex items-center justify-center flex-shrink-0">
                <Zap className="w-4 h-4 text-ember" strokeWidth={2} aria-hidden="true" />
              </span>
              <div className="flex-1 min-w-0">
                <p className="eyebrow text-ember mb-1">Live in 24 hours</p>
                <p className="text-sm text-ink-700 leading-relaxed">
                  Live on your website in 24 hours. We handle the install, the brand kit, and the first lead test.
                </p>
              </div>
            </div>
          </div>

          {/* Tier cards: Starter, Pro, Founders Concierge, Business, Enterprise */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch max-w-7xl mx-auto">
            {tiers.map((tier) => {
              const price = displayPrice(tier.id);
              const isContact = tier.id === "enterprise" || tier.id === "founders";

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col ${
                    tier.highlight ? "ed-card-ink" : "ed-card-ghost"
                  } ${tier.pill ? "pt-10" : ""}`}
                >
                  {/* Pill (Most Popular or Hands-off) */}
                  {tier.pill && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <span
                        className={`eyebrow px-4 py-1.5 rounded-full whitespace-nowrap ${
                          tier.pill.variant === "popular"
                            ? "bg-ember text-paper"
                            : "bg-ink text-paper"
                        }`}
                      >
                        {tier.pill.label}
                      </span>
                    </div>
                  )}

                  {/* Tier name + tagline */}
                  <p className={`eyebrow mb-1 ${tier.highlight ? "text-ember" : "text-ink-500"}`}>
                    {tier.name}
                  </p>
                  <p className={`text-sm leading-snug mb-6 ${tier.highlight ? "text-paper/65" : "text-ink-700"}`}>
                    {tier.tagline}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-display font-medium leading-none ${tier.highlight ? "text-paper" : "text-ink"}`}
                        style={{ fontSize: "clamp(1.8rem, 3vw, 2.4rem)" }}
                      >
                        {tier.id === "enterprise" ? `R${price.toLocaleString()}+` : `R${price.toLocaleString()}`}
                      </span>
                      <span className={`text-sm ${tier.highlight ? "text-paper/50" : "text-ink-500"}`}>/mo</span>
                    </div>
                    <p className={`text-xs mt-2 ${tier.highlight ? "text-paper/45" : "text-ink-400"}`}>
                      {tier.id === "enterprise"
                        ? "Custom volume pricing"
                        : annual
                          ? `Billed R${ANNUAL[tier.id].toLocaleString()}/year`
                          : "Billed monthly"}
                    </p>
                  </div>

                  {/* Instant Reply 60s row */}
                  <div
                    className={`mb-6 rounded-xl p-3 border ${
                      tier.highlight
                        ? "bg-paper/5 border-paper/10"
                        : tier.instantReply.included
                          ? "bg-ember/[0.06] border-ember/20"
                          : "bg-ink/[0.03] border-ink/10"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <Sparkles
                        className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                          tier.instantReply.included ? "text-ember" : "text-ink-400"
                        }`}
                        strokeWidth={2}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={`text-xs font-medium leading-snug ${tier.highlight ? "text-paper" : "text-ink"}`}>
                          Instant Reply 60s, WhatsApp + SMS push to owner
                        </p>
                        <p className={`text-[11px] mt-1 ${tier.highlight ? "text-paper/55" : "text-ink-500"}`}>
                          {tier.instantReply.included
                            ? "Included"
                            : `Add-on R${tier.instantReply.addOnPrice}/mo`}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Feature list */}
                  <ul className="flex-1 space-y-3 mb-6">
                    {tier.features.map((feature, i) => {
                      const isSectionLabel = feature.endsWith(":");
                      return (
                        <li
                          key={i}
                          className={`flex items-start gap-3 text-sm leading-relaxed ${
                            isSectionLabel
                              ? tier.highlight ? "text-paper/40" : "text-ink-400"
                              : tier.highlight ? "text-paper/85" : "text-ink-700"
                          }`}
                        >
                          {!isSectionLabel ? (
                            <Check
                              className="w-4 h-4 mt-0.5 flex-shrink-0 text-ember"
                              strokeWidth={2.5}
                            />
                          ) : (
                            <span className="w-4 flex-shrink-0" />
                          )}
                          <span className={isSectionLabel ? "eyebrow text-[9px] tracking-widest" : ""}>
                            {feature}
                          </span>
                        </li>
                      );
                    })}
                  </ul>

                  {/* Pay-per-job add-on (Pro, Founders, Business only) */}
                  {(tier.id === "pro" || tier.id === "founders" || tier.id === "business") && (
                    <div
                      className={`mb-6 pt-4 border-t border-dashed ${
                        tier.highlight ? "border-paper/20" : "border-ink/15"
                      }`}
                    >
                      <p className={`eyebrow text-[9px] tracking-widest mb-2 ${tier.highlight ? "text-paper/55" : "text-ink-400"}`}>
                        Optional add-on
                      </p>
                      <p className={`text-xs leading-relaxed ${tier.highlight ? "text-paper/75" : "text-ink-700"}`}>
                        <span className={`font-medium ${tier.highlight ? "text-paper" : "text-ink"}`}>Pay-per-job, R350</span> per booked, paid job. Opt-in only. Pay when Qwikly puts money in your pocket.
                      </p>
                    </div>
                  )}

                  {isContact ? (
                    <CTAButton
                      href={
                        tier.id === "founders"
                          ? "/contact?subject=founders-concierge"
                          : "/contact?subject=enterprise"
                      }
                      variant="primary"
                      size="md"
                      className="w-full justify-center"
                    >
                      {tier.cta}
                    </CTAButton>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPaymentPlan(tier.id as ManualPaymentPlan)}
                      className={`btn-ember ${tier.highlight ? "btn-ember-solid" : ""} px-6 py-3 text-[0.95rem] w-full justify-center cursor-pointer`}
                    >
                      <span className="relative z-10">{tier.cta}</span>
                      <svg
                        className="btn-arrow w-4 h-4 relative z-10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.25"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden="true"
                      >
                        <path d="M5 12h14" />
                        <path d="m12 5 7 7-7 7" />
                      </svg>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-center eyebrow text-ink-500 mt-10">
            Top-ups at your plan&rsquo;s per-lead rate. Cancel anytime. All prices excl. VAT.
          </p>
        </div>
      </section>

      {/* LOST REVENUE COMPARISON (replaces staff-cost framing) */}
      <section className="py-28 bg-paper-deep grain overflow-hidden">
        <div className="mx-auto max-w-site px-6 lg:px-10">

          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">What you are losing today</p>
            <h2 className="display-lg text-ink">
              Not signing up
              <br />
              <em className="italic font-light">is the more expensive choice.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-xl">
              The average SA service SMB misses 12 enquiries per month. At an
              average job value of R3,500 and a 35% close rate, that is R14,700
              of lost work every month. Industry estimate, varies by niche.
            </p>
          </div>

          {/* Lost vs Recovered */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">

            {/* Without Qwikly: lost revenue framing */}
            <div className="ed-card space-y-5">
              <p className="eyebrow text-ink-500 mb-6">Without Qwikly, monthly</p>
              {[
                { Icon: TrendingDown, text: "12 enquiries missed every month, industry estimate" },
                { Icon: Clock,        text: "Average job value R3,500, industry estimate" },
                { Icon: Zap,          text: "35% close rate on answered leads, industry estimate" },
                { Icon: TrendingDown, text: "R14,700 of lost work per month, industry estimate" },
              ].map(({ Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-ink/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-ink-400" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <p className="text-ink-700 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
              <p className="text-xs text-ink-400 pt-2 border-t border-ink/[0.08]">
                All figures industry estimate, varies by niche.
              </p>
            </div>

            {/* With Qwikly */}
            <div className="ed-card-ink space-y-5">
              <p className="eyebrow text-ember mb-6">With Qwikly Pro, R1,799/month</p>
              {[
                "Every enquiry answered in under 60 seconds, 24/7",
                "Owner gets WhatsApp + SMS push the same minute",
                "Full conversation log and lead history in your dashboard",
                "If we do not book you a job in 30 days, second month is free",
              ].map((text, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-ember/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Check className="w-4 h-4 text-ember" strokeWidth={2.5} aria-hidden="true" />
                  </span>
                  <p className="text-paper/85 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Three stat callouts */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-20">
            {[
              {
                stat: "60s",
                label: "Reply time on every new enquiry, every time of day.",
              },
              {
                stat: "R0",
                label: "Per-job commission Qwikly takes. Every rand you earn stays yours.",
              },
              {
                stat: "30 days",
                label: "If we don't book you a paying job, your second month is free.",
              },
            ].map(({ stat, label }, i) => (
              <div key={i} className="ed-card-ghost text-center py-10">
                <p
                  className="font-display font-medium text-ember leading-none mb-4"
                  style={{ fontSize: "clamp(2.5rem, 5vw, 3.5rem)" }}
                >
                  {stat}
                </p>
                <p className="text-ink-700 text-sm leading-relaxed max-w-[22ch] mx-auto">{label}</p>
              </div>
            ))}
          </div>

          {/* Section CTA */}
          <div className="text-center">
            <p className="eyebrow text-ink-500 mb-6">7 days free, no card required</p>
            <CTAButton href="/signup?plan=trial" variant="primary" size="lg">
              Start your free trial
            </CTAButton>
          </div>

        </div>
      </section>

      {/* COMPARISON TABLE */}
      <section className="py-28 bg-paper-deep grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14">
            <p className="eyebrow text-ink-500 mb-6">Compare plans</p>
            <h2 className="display-lg text-ink max-w-[20ch]">
              Everything,
              <br />
              <em className="italic font-light">side by side</em>.
            </h2>
            <p className="mt-4 text-ink-700 text-sm">
              Founders Concierge is a custom hands-off plan, talk to us for a fit.
            </p>
          </div>

          {/* Mobile: tabbed comparison */}
          <div className="sm:hidden">
            <div className="flex rounded-xl border border-ink/10 overflow-hidden mb-8">
              {(["starter", "pro", "business", "enterprise"] as CompareTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setCompareTab(tab)}
                  className={`flex-1 py-3 text-center transition-colors duration-200 cursor-pointer ${
                    compareTab === tab
                      ? "bg-ink text-paper"
                      : "text-ink-500 hover:text-ink"
                  }`}
                >
                  <span className={`eyebrow text-[9px] ${compareTab === tab && tab === "pro" ? "text-ember" : tab === "pro" ? "text-ember/70" : ""}`}>
                    {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </span>
                </button>
              ))}
            </div>

            <div className="divide-y divide-ink/[0.06] border-t border-ink/[0.06]">
              {featureRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between py-4 gap-4">
                  <span className="text-sm text-ink-700 leading-snug">{row.label}</span>
                  <div className="flex-shrink-0">
                    <TableCell value={row[compareTab]} isPremiumCol={compareTab === "pro"} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Desktop: full side-by-side table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full border-collapse min-w-[720px]">
              <thead>
                <tr className="border-b border-ink/10">
                  <th className="text-left pb-5 pr-6 font-normal eyebrow text-ink-500 w-[36%]">
                    Feature
                  </th>
                  <th className="pb-5 px-3 text-center font-normal eyebrow text-ink-500">
                    Starter
                  </th>
                  <th className="pb-5 px-3 text-center font-normal">
                    <span className="eyebrow text-ember">Pro</span>
                  </th>
                  <th className="pb-5 px-3 text-center font-normal eyebrow text-ink-500">
                    Business
                  </th>
                  <th className="pb-5 px-3 text-center font-normal eyebrow text-ink-500">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {featureRows.map((row) => (
                  <tr key={row.label} className="hover:bg-ink/[0.015] transition-colors">
                    <td className="py-4 pr-6 text-sm text-ink-700 leading-snug">
                      {row.label}
                    </td>
                    <td className="py-4 px-3 text-center">
                      <TableCell value={row.starter} />
                    </td>
                    <td className="py-4 px-3 text-center">
                      <TableCell value={row.pro} isPremiumCol />
                    </td>
                    <td className="py-4 px-3 text-center">
                      <TableCell value={row.business} />
                    </td>
                    <td className="py-4 px-3 text-center">
                      <TableCell value={row.enterprise} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* TOP-UPS EXPLAINER */}
      <section className="py-16 bg-paper-deep grain border-t border-b border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-lg">
              <p className="eyebrow text-ember mb-3">Need more leads?</p>
              <h3 className="font-display text-2xl text-ink mb-2">Top-ups at your plan&rsquo;s per-lead rate.</h3>
              <p className="text-ink-700 text-sm leading-relaxed">
                Hit your monthly cap? Top up at the same per-lead rate you&rsquo;re already paying inside your
                plan, R23 on Starter, R20 on Pro, R12 on Business. No flat overage, no plan change required.
                No surprises, no automatic billing. You approve every top-up.
              </p>
            </div>
            <div className="flex-shrink-0">
              <CTAButton variant="outline" size="md" href="/signup">
                Start Free
              </CTAButton>
            </div>
          </div>
        </div>
      </section>

      {/* GUIDED SETUP */}
      <section className="py-16 bg-paper grain border-b border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-lg">
              <p className="eyebrow text-ember mb-3">Not sure how to get started?</p>
              <h3 className="font-display text-2xl text-ink mb-2">We&rsquo;ll set it up for you, free.</h3>
              <p className="text-ink-700 text-sm leading-relaxed">
                If you know your way around your website, setup is a single copy-paste you can do yourself.
                If you&rsquo;d rather hand it off, we handle the install, the brand kit, and the first lead test for you at no charge.
                You&rsquo;ll be live in 24 hours, no code required.
              </p>
            </div>
            <div className="flex-shrink-0">
              <CTAButton variant="outline" size="md" href="/contact">
                Talk to us, free onboarding
              </CTAButton>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IS A LEAD */}
      <section className="py-28 bg-paper grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">

          <div className="mb-16">
            <p className="eyebrow text-ink-500 mb-6">Lead definition</p>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-end">
              <h2 className="display-lg text-ink">
                Not every chat<br />
                <em className="italic font-light">counts as a lead</em>.
              </h2>
              <p className="text-ink-700 text-base leading-relaxed">
                Your plan includes a monthly lead limit. We only count a conversation as a lead
                once a visitor shares their phone number or email. Curiosity is free.
                You only pay for people you can actually reach.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

            <div className="rounded-2xl border border-ink/[0.08] bg-white p-8">
              <div className="w-10 h-10 rounded-xl bg-ink/[0.05] flex items-center justify-center mb-6">
                <MessageSquare className="w-5 h-5 text-ink-400" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <p className="eyebrow text-ink-400 mb-3">Stage 1</p>
              <h3 className="font-display text-2xl text-ink mb-3">Conversation</h3>
              <p className="text-ink-600 text-sm leading-relaxed mb-6">
                Visitor opens the chat and asks a question or says hello. The assistant responds naturally.
                No contact info has been shared yet.
              </p>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ink/[0.05] border border-ink/[0.08]">
                <span className="w-2 h-2 rounded-full bg-ink/25 flex-shrink-0" />
                <span className="eyebrow text-xs text-ink-500">Not a lead</span>
              </span>
            </div>

            <div className="rounded-2xl border border-ember/25 bg-ember/[0.04] p-8">
              <div className="w-10 h-10 rounded-xl bg-ember/15 flex items-center justify-center mb-6">
                <Phone className="w-5 h-5 text-ember" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <p className="eyebrow text-ember mb-3">Stage 2</p>
              <h3 className="font-display text-2xl text-ink mb-3">Lead captured</h3>
              <p className="text-ink-600 text-sm leading-relaxed mb-6">
                Visitor shares their phone number or email address. The assistant saves it and delivers
                it to your inbox. This is when one lead counts against your monthly limit.
              </p>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-ember/10 border border-ember/20">
                <span className="w-2 h-2 rounded-full bg-ember flex-shrink-0" />
                <span className="eyebrow text-xs text-ember">Counts as 1 lead</span>
              </span>
            </div>

            <div className="rounded-2xl border border-ink/[0.08] bg-white p-8">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-6">
                <Zap className="w-5 h-5 text-green-600" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <p className="eyebrow text-ink-400 mb-3">Stage 3</p>
              <h3 className="font-display text-2xl text-ink mb-3">Booking intent</h3>
              <p className="text-ink-600 text-sm leading-relaxed mb-6">
                Visitor confirms they want a callback, meeting, or is heading to sign up. Flagged as
                &ldquo;Hot&rdquo; in your dashboard so you know who to call first. Still only 1 lead, no extra charge.
              </p>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="eyebrow text-xs text-green-700">Hot, still 1 lead</span>
              </span>
            </div>

          </div>

          <div className="rounded-2xl border border-ink/[0.08] bg-ink/[0.02] p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="eyebrow text-ink-500 mb-4">What never counts</p>
                <h3 className="font-display text-2xl text-ink mb-4">
                  Bounced chats don&rsquo;t touch your limit.
                </h3>
                <p className="text-ink-700 text-sm leading-relaxed">
                  If a visitor opens the chat and leaves without sharing contact details, we don&rsquo;t count it.
                  Spam, bots, test messages, and visitors who only give their name, none of these
                  come out of your monthly allowance. Your plan only goes down when a real,
                  reachable person comes through.
                </p>
              </div>
              <div className="space-y-4">
                {[
                  "Visitor opens the chat but doesn't reply",
                  "Gives only their name, no phone or email",
                  "Leaves before sharing contact details",
                  "Spam or automated bot traffic",
                  "Your own test conversations",
                ].map((text, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full border border-ink/20 flex items-center justify-center flex-shrink-0">
                      <X className="w-3 h-3 text-ink-400" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                    <p className="text-ink-600 text-sm">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* NICHE CHIPS */}
      <section className="bg-paper grain border-t border-ink/[0.06]">
        <NicheChips />
      </section>

      </div>
      {/* END DIGITAL ASSISTANT SECTION */}

      {/* PIPELINE SECTION */}
      <div id="pipeline" className="block scroll-mt-24">

        {/* Section header */}
        <section className="relative pt-20 pb-6 grain overflow-hidden border-t border-ink/[0.06]">
          <div className="relative mx-auto max-w-site px-6 lg:px-10">
            <p className="eyebrow text-ember mb-4">Service 2, Pipeline</p>
            <h2 className="display-lg text-ink max-w-[24ch]">
              Outbound lead generation,
              <br />
              <em className="italic font-light">R7,500 setup + R7,500 to R15,000/mo.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 max-w-2xl leading-relaxed">
              We find your ideal buyers, write each a personal email, and book qualified meetings on your calendar.
            </p>
          </div>
        </section>

        {/* Pipeline tiers */}
        <section className="py-16 bg-paper-deep grain border-t border-b border-ink/[0.06]">
          <div className="mx-auto max-w-site px-6 lg:px-10">
            <PipelinePricingBlock />

            {/* Risk reversal */}
            <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-ember/25 bg-ember/[0.06] p-8 md:p-10 text-center">
              <p className="eyebrow text-ember mb-3">Risk reversal</p>
              <p className="font-display text-xl md:text-2xl text-ink leading-snug">
                If we do not book you 5 qualified meetings in your first 60 days, your third month is free.
              </p>
            </div>
          </div>
        </section>

      </div>
      {/* END PIPELINE SECTION */}

      {/* BUNDLE OFFER */}
      <section className="py-20 grain overflow-hidden">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="max-w-4xl mx-auto rounded-2xl border-2 border-dashed border-ember/40 bg-ember/[0.04] p-8 md:p-12">
            <p className="eyebrow text-ember mb-4">Bundle</p>
            <h3 className="font-display text-2xl md:text-3xl text-ink leading-snug mb-4 max-w-[24ch]">
              Run both services together.
            </h3>
            <p className="text-ink-700 text-base leading-relaxed max-w-2xl mb-8">
              Pipeline brings buyers to your website. Digital Assistant captures and qualifies them in under 60 seconds. Run both, save 10% on monthly fees, lock the entire funnel.
            </p>
            <CTAButton
              href="/contact?subject=qwikly-bundle"
              variant="primary"
              size="md"
            >
              Talk to us about the bundle
            </CTAButton>
          </div>
        </div>
      </section>

      {/* PRICING FAQ */}
      <section className="py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-4">
              <p className="eyebrow text-ink-500 mb-6">Questions</p>
              <h2 className="display-lg text-ink">
                Straight
                <br />
                <em className="italic font-light">answers</em>.
              </h2>
            </div>

            <div className="md:col-span-8 md:col-start-5">
              <div className="divide-y divide-ink/10 border-t border-ink/10">
                {pricingFAQs.map((faq, index) => {
                  const isOpen = openFAQ === index;
                  return (
                    <div key={index}>
                      <button
                        onClick={() => setOpenFAQ(isOpen ? null : index)}
                        className="w-full flex items-start justify-between py-6 text-left gap-6 cursor-pointer group"
                      >
                        <span
                          className={`font-display text-xl leading-snug transition-colors duration-200 ${
                            isOpen ? "text-ember" : "text-ink group-hover:text-ember"
                          }`}
                        >
                          {faq.question}
                        </span>
                        <span
                          className={`flex-shrink-0 mt-1 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                            isOpen
                              ? "bg-ember border-ember text-paper"
                              : "border-ink/20 text-ink group-hover:border-ember group-hover:text-ember"
                          }`}
                        >
                          {isOpen ? (
                            <Minus className="w-4 h-4" strokeWidth={2} />
                          ) : (
                            <Plus className="w-4 h-4" strokeWidth={2} />
                          )}
                        </span>
                      </button>
                      <div
                        className={`overflow-hidden transition-all duration-500 ease-in-out ${
                          isOpen ? "max-h-96 pb-8" : "max-h-0"
                        }`}
                      >
                        <p className="text-ink-700 text-base leading-relaxed max-w-prose">
                          {faq.answer}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="py-12 border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            <div className="flex items-center gap-2.5">
              <Shield className="w-5 h-5 text-ember" strokeWidth={1.5} aria-hidden="true" />
              <span className="eyebrow text-ink-600">POPIA Compliant</span>
            </div>
            <div className="hidden md:block w-px h-5 bg-ink/10" />
            <div className="flex items-center gap-2.5">
              <MapPin className="w-5 h-5 text-ember" strokeWidth={1.5} aria-hidden="true" />
              <span className="eyebrow text-ink-600">Hosted in South Africa</span>
            </div>
            <div className="hidden md:block w-px h-5 bg-ink/10" />
            <div className="flex items-center gap-2.5">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-ember" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="eyebrow text-ink-600">ZAR Pricing</span>
            </div>
          </div>
          <div className="mt-8 flex justify-center">
            <LiveCounter />
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[20ch] mx-auto">
            Stop losing leads.{" "}
            <em className="italic font-light text-ember">Start booking jobs.</em>
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            7 days free. If we don&rsquo;t book you a paying job in 30 days, your second month is free.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton size="lg" variant="solid" href="/signup?plan=trial">
              Start free trial
            </CTAButton>
            <CTAButton size="lg" variant="outline-light" href="/contact" withArrow={false}>
              Talk to us
            </CTAButton>
          </div>
        </div>
      </section>

      {paymentPlan && (
        <ManualPaymentModal
          open={!!paymentPlan}
          plan={paymentPlan}
          cycle={annual ? "annual" : "monthly"}
          onClose={() => setPaymentPlan(null)}
        />
      )}
    </div>
  );
}
