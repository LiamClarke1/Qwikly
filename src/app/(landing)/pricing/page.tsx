"use client";

import { useState } from "react";
import { Check, X, Sparkles } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import ManualPaymentModal, { type ManualPaymentPlan } from "@/components/ManualPaymentModal";

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

// The 4 most important features per card (compressed summary list)
const cardHighlights: Record<TierId, string[]> = {
  starter: [
    "Digital assistant on your website",
    "30 qualified leads/month",
    "Email lead delivery",
    "Email support, 24h response",
  ],
  pro: [
    "Everything in Starter",
    "Outbound, 5 prospects per business day",
    "100 qualified leads/month",
    "Custom branding and questions",
  ],
  founders: [
    "Everything in Pro",
    "Outbound, 10 prospects per business day",
    "Same 100 qualified leads/month",
    "Priority email support",
  ],
  business: [
    "Everything in Pro",
    "Outbound, 15 prospects per business day",
    "400 qualified leads/month",
    "Unlimited dashboard users",
  ],
  enterprise: [
    "Everything in Business",
    "Custom Outbound volume",
    "1,500+ qualified leads/month",
    "API access, dedicated support",
  ],
};

type FeatureCell = boolean | string;

// Comparison matrix rows, all 5 tiers, derived from the tier feature lists above.
const featureRows: {
  label: string;
  starter: FeatureCell;
  pro: FeatureCell;
  founders: FeatureCell;
  business: FeatureCell;
  enterprise: FeatureCell;
}[] = [
  { label: "Digital assistant on your website",  starter: true,         pro: true,         founders: true,        business: true,           enterprise: true            },
  { label: "Reply under 60 seconds",              starter: true,         pro: true,         founders: true,        business: true,           enterprise: true            },
  { label: "Email lead delivery",                 starter: true,         pro: true,         founders: true,        business: true,           enterprise: true            },
  { label: "POPIA compliant",                     starter: true,         pro: true,         founders: true,        business: true,           enterprise: true            },
  { label: "Qualified leads / month",             starter: "30",         pro: "100",        founders: "100",       business: "400",          enterprise: "1,500+"        },
  { label: "Outbound prospects / business day",   starter: false,        pro: "5",          founders: "10",        business: "15",           enterprise: "Custom"        },
  { label: "Top-up rate beyond plan",             starter: "R23 / lead", pro: "R20 / lead", founders: "R20 / lead", business: "R12 / lead",  enterprise: "Volume"        },
  { label: "Dashboard users",                     starter: "1",          pro: "3",          founders: "3",         business: "Unlimited",    enterprise: "Unlimited"     },
  { label: "Custom greeting and questions",       starter: false,        pro: true,         founders: true,        business: true,           enterprise: true            },
  { label: '"Powered by Qwikly" branding',        starter: true,         pro: false,        founders: false,       business: false,          enterprise: false           },
  { label: "Custom branding, your logo",          starter: false,        pro: true,         founders: true,        business: true,           enterprise: true            },
  { label: "Lead exports, CSV",                   starter: false,        pro: false,        founders: false,       business: true,           enterprise: true            },
  { label: "API access",                          starter: false,        pro: false,        founders: false,       business: false,          enterprise: true            },
  { label: "Support response",                    starter: "24h",        pro: "12h",        founders: "Priority",  business: "4h",           enterprise: "1h"            },
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

function MatrixCell({ value, isPremiumCol }: { value: FeatureCell; isPremiumCol?: boolean }) {
  if (typeof value === "string") {
    return (
      <span className={`font-display text-base md:text-lg leading-none ${isPremiumCol ? "text-ember" : "text-ink"}`}>
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
      <span className="text-[11px] tracking-wide uppercase text-ink-300">Not included</span>
    </span>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);
  const [paymentPlan, setPaymentPlan] = useState<ManualPaymentPlan | null>(null);

  function displayPrice(id: TierId) {
    return annual ? Math.round(ANNUAL[id] / 12) : MONTHLY[id];
  }

  function handleTierCTA(id: TierId) {
    if (id === "enterprise") {
      window.location.href = "/contact?subject=enterprise";
      return;
    }
    setPaymentPlan(id as ManualPaymentPlan);
  }

  return (
    <div className="bg-paper">

      {/* HERO, single headline + paragraph + toggle */}
      <section className="relative pt-36 md:pt-44 pb-12 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h1 className="display-huge text-ink mx-auto max-w-[18ch] reveal-up">
            Compare every plan,{" "}
            <em className="italic font-light">side by side</em>.
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-2xl mx-auto leading-relaxed">
            One flat monthly fee, no setup costs, no commissions. Pick the row that matters to you and read across. The full matrix is right below.
          </p>

          {/* Monthly / Annual toggle */}
          <div className="mt-12 flex items-center justify-center gap-4 flex-wrap">
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
        </div>
      </section>

      {/* SECTION 1, THE MATRIX (lead element) */}
      <section className="pb-24 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">

          <div className="mb-10 flex items-end justify-between flex-wrap gap-4">
            <div>
              <p className="eyebrow text-ink-500 mb-3">The matrix</p>
              <h2 className="display-lg text-ink max-w-[18ch]">
                Compare every plan.
              </h2>
            </div>
            <p className="text-ink-500 text-sm max-w-md">
              Pro is the most popular plan. Founders sits between Pro and Business, same Inbound limits as Pro with double the daily Outbound.
            </p>
          </div>

          <div className="rounded-2xl bg-white shadow-pop border border-ink/10 overflow-hidden">
            <div className="max-h-[85vh] overflow-y-auto overflow-x-auto">
              <table className="w-full border-collapse min-w-[960px]">
                <thead className="sticky top-0 z-20">
                  <tr className="bg-paper-deep">
                    <th className="text-left p-6 align-bottom w-[26%] border-b border-ink/10">
                      <span className="eyebrow text-ink-500">Feature</span>
                    </th>
                    {tiers.map((tier) => {
                      const isPro = tier.id === "pro";
                      const price = displayPrice(tier.id);
                      return (
                        <th
                          key={tier.id}
                          className={`p-5 align-bottom text-left border-b border-ink/10 ${isPro ? "bg-ember/5" : ""}`}
                        >
                          <div className="flex flex-col gap-3 min-w-[140px]">
                            {isPro && (
                              <span className="eyebrow self-start px-2 py-0.5 rounded-full bg-ember text-paper text-[10px]">
                                Most Popular
                              </span>
                            )}
                            <div>
                              <p className={`font-display text-xl leading-tight ${isPro ? "text-ember" : "text-ink"}`}>
                                {tier.name}
                              </p>
                              <p className="font-sans text-[11px] text-ink-500 leading-snug mt-1 max-w-[18ch]">
                                {tier.tagline}
                              </p>
                            </div>
                            <div>
                              <p className={`font-display font-medium leading-none ${isPro ? "text-ember" : "text-ink"}`} style={{ fontSize: "1.6rem" }}>
                                {tier.id === "enterprise" ? `R${price.toLocaleString()}+` : `R${price.toLocaleString()}`}
                              </p>
                              <p className="font-sans text-[10px] text-ink-500 mt-1">
                                {tier.id === "enterprise"
                                  ? "Custom volume"
                                  : annual
                                    ? `R${ANNUAL[tier.id].toLocaleString()}/yr`
                                    : "/month"}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleTierCTA(tier.id)}
                              className={`w-full text-center text-[11px] font-medium py-2 rounded-full cursor-pointer transition-colors ${
                                isPro
                                  ? "bg-ember text-paper hover:bg-ember/90"
                                  : "border border-ink/15 text-ink hover:border-ink hover:bg-ink hover:text-paper"
                              }`}
                            >
                              {tier.id === "enterprise" ? "Talk to us" : "Choose"}
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.06]">
                  {featureRows.map((row) => (
                    <tr key={row.label} className="hover:bg-ink/[0.015] transition-colors">
                      <td className="py-4 px-6 text-sm text-ink-700 leading-snug font-sans">
                        {row.label}
                      </td>
                      <td className="py-4 px-5 text-left">
                        <MatrixCell value={row.starter} />
                      </td>
                      <td className="py-4 px-5 text-left bg-ember/5">
                        <MatrixCell value={row.pro} isPremiumCol />
                      </td>
                      <td className="py-4 px-5 text-left">
                        <MatrixCell value={row.founders} />
                      </td>
                      <td className="py-4 px-5 text-left">
                        <MatrixCell value={row.business} />
                      </td>
                      <td className="py-4 px-5 text-left">
                        <MatrixCell value={row.enterprise} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <p className="text-center eyebrow text-ink-500 mt-8">
            No setup fee. Cancel anytime. All prices excl. VAT.
          </p>
        </div>
      </section>

      {/* SECTION 2, TIER CARDS (compressed quick summary) */}
      <section className="py-24 bg-paper-deep grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">

          <div className="mb-12">
            <p className="eyebrow text-ink-500 mb-3">At a glance</p>
            <h2 className="display-lg text-ink max-w-[20ch]">
              The plans,{" "}
              <em className="italic font-light">in short</em>.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-stretch">
            {tiers.map((tier) => {
              const price = displayPrice(tier.id);
              const isContact = tier.id === "enterprise";
              const isPro = tier.id === "pro";

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col rounded-2xl p-5 border ${
                    isPro
                      ? "bg-ink text-paper border-ink"
                      : "bg-white border-ink/10"
                  } ${tier.pill ? "pt-8" : ""}`}
                >
                  {tier.pill && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <span
                        className={`eyebrow px-3 py-1 rounded-full whitespace-nowrap text-[10px] ${
                          tier.pill.variant === "popular"
                            ? "bg-ember text-paper"
                            : "bg-ink text-paper"
                        }`}
                      >
                        {tier.pill.label}
                      </span>
                    </div>
                  )}

                  <p className={`eyebrow mb-1 ${isPro ? "text-ember" : "text-ink-500"}`}>
                    {tier.name}
                  </p>
                  <p className={`text-xs leading-snug mb-3 ${isPro ? "text-paper/65" : "text-ink-700"}`}>
                    {tier.tagline}
                  </p>

                  {tier.bundleBadge && (
                    <div className="mb-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] ${
                        isPro ? "bg-paper/10 text-paper/80" : "bg-ink-50 text-ink-700"
                      }`}>
                        <Sparkles className="w-3 h-3" aria-hidden />
                        {tier.bundleBadge}
                      </span>
                    </div>
                  )}

                  <div className="mb-4">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-display font-medium leading-none ${isPro ? "text-paper" : "text-ink"}`}
                        style={{ fontSize: "1.7rem" }}
                      >
                        {tier.id === "enterprise" ? `R${price.toLocaleString()}+` : `R${price.toLocaleString()}`}
                      </span>
                      <span className={`text-xs ${isPro ? "text-paper/50" : "text-ink-500"}`}>/mo</span>
                    </div>
                    <p className={`text-[10px] mt-1 ${isPro ? "text-paper/45" : "text-ink-400"}`}>
                      {tier.id === "enterprise"
                        ? "Custom volume pricing"
                        : annual
                          ? `Billed R${ANNUAL[tier.id].toLocaleString()}/year`
                          : "Billed monthly"}
                    </p>
                  </div>

                  <ul className="flex-1 space-y-2 mb-5">
                    {cardHighlights[tier.id].map((feature, i) => (
                      <li
                        key={i}
                        className={`flex items-start gap-2 text-xs leading-relaxed ${
                          isPro ? "text-paper/85" : "text-ink-700"
                        }`}
                      >
                        <Check
                          className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-ember"
                          strokeWidth={2.5}
                        />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {isContact ? (
                    <CTAButton
                      href="/contact?subject=enterprise"
                      variant="outline"
                      size="md"
                      className="w-full justify-center text-xs"
                    >
                      {tier.cta}
                    </CTAButton>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setPaymentPlan(tier.id as ManualPaymentPlan)}
                      className={`w-full text-center text-xs font-medium py-2.5 rounded-full cursor-pointer transition-colors ${
                        isPro
                          ? "bg-ember text-paper hover:bg-ember/90"
                          : "border border-ink/15 text-ink hover:bg-ink hover:text-paper hover:border-ink"
                      }`}
                    >
                      {tier.cta}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex justify-center">
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
        </div>
      </section>

      {/* SECTION 3, EXTRAS (quiet prose, no boxes) */}
      <section className="py-24 bg-paper grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-4">
              <p className="eyebrow text-ink-500 mb-3">Extras</p>
              <h2 className="display-lg text-ink">
                What about{" "}
                <em className="italic font-light">extras</em>.
              </h2>
            </div>
            <div className="md:col-span-8 md:col-start-5 space-y-6 text-ink-700 text-base leading-relaxed">
              <p>
                If you hit your monthly lead cap, you can top up at the same per-lead rate you are already paying inside your plan. That is R23 per lead on Starter, R20 on Pro and Founders, R12 on Business. Enterprise tops up at volume pricing. There is no flat overage charge, no plan change required, and no automatic billing. You approve every top-up.
              </p>
              <p>
                Outbound prospect volume is fixed per tier, 5 per business day on Pro, 10 on Founders, 15 on Business, custom on Enterprise. If you need more, the cleanest path is moving up a tier rather than buying ad-hoc add-ons. That keeps your monthly bill predictable.
              </p>
              <p>
                A lead is only counted when a visitor shares a phone number or email. Bounced chats, bots, name-only conversations, and your own test messages never come out of your monthly allowance. You only pay for people you can actually reach.
              </p>
              <p>
                Every paid plan is flat monthly with no setup fee, no onboarding charge, and no commission on jobs you win. If you upgrade or downgrade mid-cycle, upgrades take effect immediately and downgrades apply at the start of the next billing period.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4, FAQ */}
      <section className="py-28 grain border-t border-ink/[0.06]">
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
                            <X className="w-4 h-4" strokeWidth={2} />
                          ) : (
                            <span className="text-xl leading-none" aria-hidden>+</span>
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

      {/* BOTTOM CTA */}
      <section className="relative py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[22ch] mx-auto">
            Two things, done well.{" "}
            <em className="italic font-light text-ember">Try it for 7 days.</em>
          </h2>
          <div className="mt-12 flex justify-center">
            <CTAButton size="lg" variant="solid" href="/signup?plan=trial">
              Start free trial
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
