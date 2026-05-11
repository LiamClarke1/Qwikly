"use client";

import { useState } from "react";
import { Check, Minus, Plus, Shield, MapPin, Zap, MessageSquare, Phone, X, Sparkles } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import ManualPaymentModal, { type ManualPaymentPlan } from "@/components/ManualPaymentModal";
import { LiveCounter } from "@/components/landing/LiveCounter";
import { NicheChips } from "@/components/pricing/NicheChips";

// Tier pricing. Annual = monthly x 12 x 0.85 (15% off, rounded).
const MONTHLY = { starter: 699, pro: 1799, founders: 2999, business: 3999, enterprise: 7999 } as const;
const ANNUAL  = { starter: 7128, pro: 18350, founders: 30590, business: 40790, enterprise: 81590 } as const;

type TierId = keyof typeof MONTHLY;

const tiers: {
  id: TierId;
  name: string;
  tagline: string;
  features: string[];
  highlight: boolean;
  pill?: { label: string; variant: "popular" | "outbound" };
  cta: string;
  bundleBadge?: string;
}[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Solo trades, individual agents, sole practitioners",
    highlight: false,
    cta: "Start with Starter",
    features: [
      "Digital assistant on your website",
      "Replies to visitors in under 60 seconds",
      "30 qualified leads/month",
      "Email lead delivery to the business owner",
      "1 dashboard user",
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
    bundleBadge: "Outbound included",
    features: [
      "Everything in Starter",
      "Outbound system, 5 hand-picked prospects per business day",
      "100 qualified leads/month",
      "3 dashboard users",
      "Custom branding, your logo and colours",
      "Custom greeting and qualifying questions",
      "Email support, 12h response",
    ],
  },
  {
    id: "founders",
    name: "Founders",
    tagline: "Pro plan with double the Outbound volume",
    highlight: false,
    pill: { label: "10 prospects/day", variant: "outbound" },
    cta: "Start with Founders",
    bundleBadge: "More Outbound",
    features: [
      "Everything in Pro",
      "Outbound system, 10 hand-picked prospects per business day",
      "Same 100 qualified leads/month",
      "Priority email support",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "Multi-doctor, multi-agent, busy practices",
    highlight: false,
    cta: "Start with Business",
    bundleBadge: "Outbound included",
    features: [
      "Everything in Pro",
      "Outbound system, 15 hand-picked prospects per business day",
      "400 qualified leads/month",
      "Unlimited dashboard users",
      "Lead exports, CSV",
      "Priority email support, 4h response",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-location, white-label, mission-critical",
    highlight: false,
    cta: "Talk to us",
    bundleBadge: "Outbound included",
    features: [
      "Everything in Business",
      "Custom Outbound prospect volume",
      "1,500+ qualified leads/month",
      "API access for custom integrations",
      "Dedicated support, 1h response",
      "Custom onboarding",
    ],
  },
];

type FeatureCell = boolean | string;

const featureRows: { label: string; starter: FeatureCell; pro: FeatureCell; business: FeatureCell; enterprise: FeatureCell }[] = [
  { label: "Digital assistant on your website",   starter: true,    pro: true,    business: true,     enterprise: true     },
  { label: "Reply under 60 seconds",               starter: true,    pro: true,    business: true,     enterprise: true     },
  { label: "Email lead delivery",                  starter: true,    pro: true,    business: true,     enterprise: true     },
  { label: "POPIA compliant",                      starter: true,    pro: true,    business: true,     enterprise: true     },
  { label: "Qualified leads / month",              starter: "30",    pro: "100",   business: "400",    enterprise: "1,500+" },
  { label: "Outbound prospects / business day",    starter: false,   pro: "5",     business: "15",     enterprise: "Custom" },
  { label: "Top-up rate beyond plan",              starter: "R23 / lead", pro: "R20 / lead", business: "R12 / lead", enterprise: "Volume" },
  { label: "Dashboard users",                      starter: "1",     pro: "3",     business: "Unlimited", enterprise: "Unlimited" },
  { label: "Custom greeting and questions",        starter: false,   pro: true,    business: true,     enterprise: true     },
  { label: '"Powered by Qwikly" branding',         starter: true,    pro: false,   business: false,    enterprise: false    },
  { label: "Custom branding, your logo",           starter: false,   pro: true,    business: true,     enterprise: true     },
  { label: "Lead exports, CSV",                    starter: false,   pro: false,   business: true,     enterprise: true     },
  { label: "API access",                           starter: false,   pro: false,   business: false,    enterprise: true     },
  { label: "Support response",                     starter: "24h",   pro: "12h",   business: "4h",     enterprise: "1h"     },
];

const pricingFAQs = [
  {
    question: "What exactly does Qwikly do?",
    answer:
      "Two things. One, a digital assistant on your website that replies to visitors in under 60 seconds, asks them your qualifying questions, captures their contact info, and emails you when a new lead comes in. Two, on Pro and above, an Outbound system that hand-picks prospects that match your target client, verifies their contact info, and delivers them to your dashboard daily. You decide who to reach out to. That is the whole product.",
  },
  {
    question: "How fast does Qwikly reply to a new visitor?",
    answer:
      "Under 60 seconds, every time. The digital assistant replies in the chat on your website, and as soon as the visitor shares their phone number or email, the lead lands in your inbox by email. That is the only notification channel, no SMS, no WhatsApp, just email.",
  },
  {
    question: "How does the Outbound system work?",
    answer:
      "On Pro and above, we hand-pick prospects each business day that match the target client you describe to us. We verify the contact info before handing it over and deliver the list to your dashboard with suggested outreach copy. You decide who to actually contact and when. We do not send anything on your behalf. Pro gets 5 prospects per business day, Founders gets 10, Business gets 15, Enterprise is custom.",
  },
  {
    question: "What counts as a qualified lead?",
    answer:
      "A lead is counted only when a visitor shares their phone number or email address. Someone who opens the chat, says hi, or gives only their name does not count. Bounced chats, bots, and your own test messages never count. You only pay for people you can actually reach.",
  },
  {
    question: "What happens when I hit my monthly lead limit?",
    answer:
      "We notify you before you hit the cap. You can upgrade your plan, or top up at your plan's per-lead rate, R23 on Starter, R20 on Pro, R12 on Business. No flat overage, no automatic billing, no surprise charges. Your digital assistant keeps working until you decide.",
  },
  {
    question: "What happens after my 7-day trial?",
    answer:
      "At the end of your trial, you choose a paid plan to continue. If you do not upgrade, your account pauses. You keep your dashboard and your lead history. Upgrade any time to reactivate.",
  },
  {
    question: "Can I switch plans anytime?",
    answer:
      "Yes. Upgrade or downgrade from your dashboard at any time. Upgrades take effect immediately. Downgrades apply at the start of your next billing period.",
  },
  {
    question: "Do you take a cut of my jobs?",
    answer:
      "Never. Qwikly charges a flat monthly rate only. We earn nothing from your bookings. Every rand you earn stays yours.",
  },
  {
    question: "Is there a setup fee?",
    answer:
      "No. Every paid plan is a flat monthly fee, no setup fee, no onboarding charge. Outbound is included from Pro upward at no extra cost.",
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

  function displayPrice(id: TierId) {
    return annual ? Math.round(ANNUAL[id] / 12) : MONTHLY[id];
  }

  return (
    <div className="bg-paper">

      {/* HERO */}
      <section className="relative pt-32 md:pt-36 pb-12 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">Pricing</p>
          <h1 className="display-xl text-ink max-w-[22ch]">
            Two things.{" "}
            <em className="italic font-light">Honestly priced.</em>
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-2xl leading-relaxed">
            Qwikly does two things. A digital assistant on your website that replies to visitors in under 60 seconds and emails you the lead. And, on Pro and above, an Outbound system that hand-picks prospects that match your ideal client and drops them in your dashboard daily. That is the whole product. No setup fees, no surprises.
          </p>
          <LiveCounter />
        </div>
      </section>

      {/* WHAT WE DO, WHAT WE DON'T */}
      <section className="relative pb-20 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl">
            <div className="ed-card">
              <p className="eyebrow text-ember mb-4">What Qwikly does</p>
              <ul className="space-y-3">
                {[
                  "Replies to website visitors in under 60 seconds",
                  "Asks the qualifying questions you choose",
                  "Captures phone number or email",
                  "Emails you the lead when it comes in",
                  "On Pro and up, delivers daily hand-picked outbound prospects to your dashboard",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink-700 leading-relaxed">
                    <Check className="w-4 h-4 mt-0.5 flex-shrink-0 text-ember" strokeWidth={2.5} />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="ed-card">
              <p className="eyebrow text-ink-500 mb-4">What Qwikly does not do</p>
              <ul className="space-y-3">
                {[
                  "Book leads into your calendar",
                  "Send calendar invites to your customers",
                  "Notify you by SMS or WhatsApp",
                  "Reach out to prospects on your behalf",
                  "Charge per job, take commissions, or add setup fees",
                ].map((text, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-ink-700 leading-relaxed">
                    <X className="w-4 h-4 mt-0.5 flex-shrink-0 text-ink-400" strokeWidth={2.5} />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
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

          {/* Tier cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 items-stretch max-w-7xl mx-auto">
            {tiers.map((tier) => {
              const price = displayPrice(tier.id);
              const isContact = tier.id === "enterprise";

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col ${
                    tier.highlight ? "ed-card-ink" : "ed-card-ghost"
                  } ${tier.pill ? "pt-10" : ""}`}
                >
                  {/* Pill */}
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
                  <p className={`text-sm leading-snug ${tier.bundleBadge ? "mb-2" : "mb-6"} ${tier.highlight ? "text-paper/65" : "text-ink-700"}`}>
                    {tier.tagline}
                  </p>
                  {tier.bundleBadge && (
                    <div className="mb-6">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-ink-50 text-tiny text-ink-700">
                        <Sparkles className="w-3 h-3" aria-hidden />
                        {tier.bundleBadge}
                      </span>
                    </div>
                  )}

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

                  {/* Feature list */}
                  <ul className="flex-1 space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-3 text-sm leading-relaxed ${
                          tier.highlight ? "text-paper/85" : "text-ink-700"
                        }`}
                      >
                        <Check
                          className="w-4 h-4 mt-0.5 flex-shrink-0 text-ember"
                          strokeWidth={2.5}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isContact ? (
                    <CTAButton
                      href="/contact?subject=enterprise"
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
            No setup fee. Top-ups at your plan&rsquo;s per-lead rate. Cancel anytime. All prices excl. VAT.
          </p>
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
              Founders sits between Pro and Business, same Inbound limits as Pro with double the daily Outbound prospects.
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
                Hit your monthly cap? Top up at the same per-lead rate you are already paying inside your
                plan, R23 on Starter, R20 on Pro, R12 on Business. No flat overage, no plan change required,
                no automatic billing. You approve every top-up.
              </p>
            </div>
            <div className="flex-shrink-0">
              <CTAButton variant="outline" size="md" href="/signup">
                Start free
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
                Visitor shares their phone number or email address. The assistant saves it and emails
                it to you. This is when one lead counts against your monthly limit.
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
                Visitor confirms they want a callback or is ready to sign up. Flagged as
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
          <h2 className="display-xl text-paper max-w-[22ch] mx-auto">
            Two things, done well.{" "}
            <em className="italic font-light text-ember">Try it for 7 days.</em>
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            7 days free. No card required. Cancel anytime.
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
