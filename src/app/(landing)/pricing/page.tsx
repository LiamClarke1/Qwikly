"use client";

import { useState } from "react";
import { Check, X } from "lucide-react";
import CTAButton from "@/components/CTAButton";

// Tier pricing. Annual = monthly x 12 x 0.85 (15% off, rounded).
const MONTHLY = { starter: 699, pro: 1799, business: 3999, enterprise: 7999 } as const;
const ANNUAL  = { starter: 7128, pro: 18350, business: 40790, enterprise: 81590 } as const;

type TierId = keyof typeof MONTHLY;

const tiers: {
  id: TierId;
  name: string;
  tagline: string;
  highlight: boolean;
  pill?: { label: string; variant: "popular" };
  cta: string;
}[] = [
  {
    id: "starter",
    name: "Starter",
    tagline: "Solo trades, individual agents, sole practitioners",
    highlight: false,
    cta: "Book a call",
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "Small multi-person practices and teams",
    highlight: true,
    pill: { label: "Most Popular", variant: "popular" },
    cta: "Book a call",
  },
  {
    id: "business",
    name: "Business",
    tagline: "Multi-doctor, multi-agent, busy practices",
    highlight: false,
    cta: "Book a call",
  },
  {
    id: "enterprise",
    name: "Enterprise",
    tagline: "Multi-location, white-label, mission-critical",
    highlight: false,
    cta: "Talk to us",
  },
];

// Plan card highlights — both inbound and outbound features
const cardHighlights: Record<TierId, string[]> = {
  starter: [
    "Digital assistant on your website, 24/7",
    "Up to 20 leads/month captured",
    "400 conversations/month included",
    "Replies to visitors in under 60 seconds",
    "POPIA compliant",
    "Email support, 24h response",
  ],
  pro: [
    "Everything in Starter",
    "Up to 50 leads/month captured",
    "5 outbound prospects per business day",
    "1,000 conversations/month included",
    "Custom branding, your logo and colours",
    "3 dashboard users",
  ],
  business: [
    "Everything in Pro",
    "Up to 200 leads/month captured",
    "10 outbound prospects per business day",
    "4,000 conversations/month included",
    "Unlimited dashboard users",
    "Lead exports, CSV",
  ],
  enterprise: [
    "Everything in Business",
    "Up to 600+ leads/month captured",
    "20 outbound prospects per business day",
    "12,000+ conversations/month included",
    "API access for custom integrations",
    "Custom onboarding",
  ],
};

type FeatureCell = boolean | string;

// Comparison matrix — inbound AND outbound rows together
const featureRows: {
  label: string;
  section?: string;
  starter: FeatureCell;
  pro: FeatureCell;
  business: FeatureCell;
  enterprise: FeatureCell;
}[] = [
  // Inbound
  { label: "Digital assistant on your website",         section: "Inbound", starter: true,         pro: true,         business: true,           enterprise: true            },
  { label: "Reply under 60 seconds",                    starter: true,         pro: true,         business: true,           enterprise: true            },
  { label: "POPIA compliant",                           starter: true,         pro: true,         business: true,           enterprise: true            },
  { label: "Conversations included / month",            starter: "400/mo",     pro: "1,000/mo",   business: "4,000/mo",     enterprise: "12,000+/mo"    },
  { label: "Leads captured / month (inbound)",          starter: "Up to 20",   pro: "Up to 50",   business: "Up to 200",    enterprise: "Up to 600+"    },
  { label: "Email lead delivery",                       starter: false,        pro: true,         business: true,           enterprise: true            },
  { label: "Top-up rate beyond plan",                   starter: "R35/lead",   pro: "R36/lead",   business: "R20/lead",     enterprise: "Volume"        },
  { label: "Custom greeting and questions",             starter: false,        pro: true,         business: true,           enterprise: true            },
  { label: '"Powered by Qwikly" branding',              starter: true,         pro: false,        business: false,          enterprise: false           },
  { label: "Custom branding, your logo",                starter: false,        pro: true,         business: true,           enterprise: true            },
  { label: "Lead exports, CSV",                         starter: false,        pro: false,        business: true,           enterprise: true            },
  // Outbound
  { label: "Outbound prospects / day",                  section: "Outbound", starter: false,      pro: "5/day",      business: "10/day",        enterprise: "20/day"        },
  { label: "Done-for-you outbound prospecting",         starter: false,        pro: true,         business: true,           enterprise: true            },
  { label: "Target list built for you",                 starter: false,        pro: true,         business: true,           enterprise: true            },
  { label: "Sequences written and sent for you",        starter: false,        pro: true,         business: true,           enterprise: true            },
  { label: "Warm replies delivered to your inbox",      starter: false,        pro: true,         business: true,           enterprise: true            },
  // Platform
  { label: "Dashboard users",                           section: "Platform", starter: "1",        pro: "3",          business: "Unlimited",     enterprise: "Unlimited"     },
  { label: "API access",                                starter: false,        pro: false,        business: false,          enterprise: true            },
  { label: "Dedicated support manager",                 starter: false,        pro: false,        business: false,          enterprise: true            },
  { label: "Custom onboarding",                         starter: false,        pro: false,        business: false,          enterprise: true            },
  { label: "Support response",                          starter: "24h",        pro: "12h",        business: "4h",           enterprise: "1h"            },
];

const pricingFAQs = [
  {
    question: "What exactly does Qwikly do?",
    answer:
      "Qwikly is one service with two engines. The first is a digital assistant on your website — it replies to visitors in under 60 seconds, qualifies them, captures their contact info, and delivers the lead to you. The second is done-for-you outbound prospecting — we build your target list, write and send cold outreach sequences, and deliver warm replies to your inbox. Both are included in the same monthly plan (Pro and above).",
  },
  {
    question: "Does outbound replace cold calling?",
    answer:
      "Yes. On Pro, Business, and Enterprise plans we handle the outbound prospecting for you — building the target list, writing the sequences, sending them, and forwarding replies to your inbox. You close the conversations. Starter is inbound-only.",
  },
  {
    question: "How fast does the digital assistant reply?",
    answer:
      "Under 60 seconds, every time. The moment a visitor opens the chat on your website, your assistant replies, qualifies them, and captures their details. Leads appear in your dashboard immediately and are emailed to you on Pro plans and above.",
  },
  {
    question: "What counts as a qualified lead?",
    answer:
      "A lead is counted only when a visitor shares their phone number or email address. Someone who opens the chat, says hi, or gives only their name does not count. Bounced chats, bots, and your own test messages never count. You only pay for people you can actually reach.",
  },
  {
    question: "What happens when I hit my monthly lead limit?",
    answer:
      "We notify you before you hit the cap. You can upgrade or top up at your plan's per-lead rate — R35 on Starter, R36 on Pro, R20 on Business. No flat overage, no automatic billing, no surprise charges.",
  },
  {
    question: "Can I switch plans anytime?",
    answer:
      "Yes. Upgrade or downgrade from your dashboard at any time. Upgrades take effect immediately. Downgrades apply at the start of your next billing period.",
  },
  {
    question: "Is there a setup fee?",
    answer:
      "No. Every paid plan is a flat monthly fee — no setup fee, no onboarding charge. We invoice you monthly by EFT. No card required online. Book a call and we set everything up for you, live within 24–48 hours.",
  },
  {
    question: "Do you take a cut of my jobs?",
    answer:
      "Never. Qwikly charges a flat monthly rate only. We earn nothing from your bookings. Every rand you earn stays yours.",
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
      <span className="text-[11px] tracking-wide uppercase text-ink-300">—</span>
    </span>
  );
}

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  function displayPrice(id: TierId) {
    return annual ? Math.round(ANNUAL[id] / 12) : MONTHLY[id];
  }

  function handleTierCTA(id: TierId) {
    window.location.href = `/contact?subject=plan-${id}`;
  }

  return (
    <div className="bg-paper">

      {/* HERO */}
      <section className="relative pt-36 md:pt-44 pb-12 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h1 className="display-huge text-ink mx-auto max-w-[18ch] reveal-up">
            One service,{" "}
            <em className="italic font-light">every plan</em>.
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-2xl mx-auto leading-relaxed">
            Every Qwikly plan includes both inbound <em>(digital assistant on your website)</em> and outbound <em>(done-for-you prospecting)</em>. Starter is inbound only. Pro and above unlock outbound.
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

      {/* SECTION 1 — COMPARISON MATRIX */}
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
              Inbound and outbound features listed together. Pro is the most popular plan.
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
                              Book a call
                            </button>
                          </div>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.06]">
                  {featureRows.map((row) => (
                    <>
                      {row.section && (
                        <tr key={`section-${row.section}`} className="bg-ink/[0.025]">
                          <td colSpan={5} className="py-2 px-6">
                            <span className="eyebrow text-ink-400 text-[10px]">{row.section}</span>
                          </td>
                        </tr>
                      )}
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
                          <MatrixCell value={row.business} />
                        </td>
                        <td className="py-4 px-5 text-left">
                          <MatrixCell value={row.enterprise} />
                        </td>
                      </tr>
                    </>
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

      {/* SECTION 2 — PLAN CARDS */}
      <section className="py-24 bg-paper-deep grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">

          <div className="mb-12">
            <p className="eyebrow text-ink-500 mb-3">At a glance</p>
            <h2 className="display-lg text-ink max-w-[20ch]">
              The plans,{" "}
              <em className="italic font-light">in short</em>.
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-stretch">
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
                      <span className="eyebrow px-3 py-1 rounded-full whitespace-nowrap text-[10px] bg-ember text-paper">
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
                    <a
                      href={`/contact?subject=plan-${tier.id}`}
                      className={`w-full block text-center text-xs font-medium py-2.5 rounded-full cursor-pointer transition-colors ${
                        isPro
                          ? "bg-ember text-paper hover:bg-ember/90"
                          : "border border-ink/15 text-ink hover:bg-ink hover:text-paper hover:border-ink"
                      }`}
                    >
                      {tier.cta}
                    </a>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-10 flex justify-center">
            <div className="inline-flex items-start gap-3 px-5 py-4 rounded-2xl bg-ink/[0.03] border border-ink/[0.08] max-w-xl text-center">
              <span className="text-sm text-ink-700 leading-relaxed">
                <strong className="text-ink">Invoiced monthly — pay by EFT, no card needed online.</strong>
                {" "}Book a call and we set your digital assistant up for you, live within 24–48 hours.
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3 — EXTRAS */}
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
                The lead numbers on each plan are the maximum your digital assistant can capture per month from your website. Starter captures up to 20 leads, Pro up to 50, Business up to 200, Enterprise up to 600+. These are inbound leads — people already visiting your site who engage with your assistant.
              </p>
              <p>
                The outbound prospect numbers — 5/day on Pro, 10/day on Business, 20/day on Enterprise — are the number of hand-picked cold prospects we research and reach out to on your behalf each business day. Starter does not include outbound.
              </p>
              <p>
                If you hit your monthly inbound lead cap, you can top up at your plan's per-lead rate. That is R35 per lead on Starter, R36 on Pro, R20 on Business. There is no flat overage charge, no plan change required, and no automatic billing. You approve every top-up.
              </p>
              <p>
                Every paid plan is flat monthly with no setup fee, no onboarding charge, and no commission on jobs you win.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 4 — FAQ */}
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
            One service. Inbound + outbound.{" "}
            <em className="italic font-light text-ember">Let&rsquo;s get you live.</em>
          </h2>
          <p className="mt-6 text-paper/60 text-base max-w-lg mx-auto leading-relaxed">
            Book a call, pick your plan, and we set everything up for you. Invoiced monthly, no card needed online.
          </p>
          <div className="mt-10 flex justify-center">
            <CTAButton size="lg" variant="solid" href="/contact">
              Book a setup call
            </CTAButton>
          </div>
        </div>
      </section>

    </div>
  );
}
