"use client";

import { useState } from "react";
import { Check, Minus, Plus, Shield, MapPin } from "lucide-react";
import CTAButton from "@/components/CTAButton";

const MONTHLY = { trial: 0, starter: 399, pro: 999, premium: 2499, billions: 4999 } as const;
const ANNUAL  = { trial: 0, starter: 4068, pro: 10188, premium: 25490, billions: 50990 } as const;

type TierId = keyof typeof MONTHLY;

const tiers: {
  id: TierId;
  name: string;
  tagline: string;
  features: string[];
  highlight: boolean;
  cta: string;
}[] = [
  {
    id: "trial",
    name: "Trial",
    tagline: "14 days free. Full Pro features.",
    highlight: false,
    cta: "Start 14-day trial",
    features: [
      "25 qualified leads during trial",
      "Full Pro features included",
      "Digital assistant platform",
      "Email lead delivery",
      "Custom branding + questions",
      "POPIA compliant",
    ],
  },
  {
    id: "starter",
    name: "Starter",
    tagline: "For businesses just getting started",
    highlight: false,
    cta: "Start with Starter",
    features: [
      "75 qualified leads/month",
      "Digital assistant platform",
      "Email lead delivery",
      '"Powered by Qwikly" branding',
      "Email support",
      "POPIA compliant",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For businesses ready to grow",
    highlight: true,
    cta: "Start with Pro",
    features: [
      "250 qualified leads/month",
      "Everything in Starter, plus:",
      "Custom branding (your logo, no Qwikly)",
      "Custom greeting + qualifying questions",
      "Lead exports (CSV)",
      "Priority email support",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    tagline: "Unlimited leads, full control",
    highlight: false,
    cta: "Start with Premium",
    features: [
      "Up to 1,000 qualified leads/month",
      "Everything in Pro, plus:",
      "Calendar integration (coming soon)",
      "API access",
      "Dedicated support",
    ],
  },
  {
    id: "billions" as TierId,
    name: "Billions",
    tagline: "Enterprise scale, white-label",
    highlight: false,
    cta: "Start with Billions",
    features: [
      "5,000 qualified leads/month",
      "Everything in Premium, plus:",
      "White-label (no Qwikly branding)",
      "Dedicated account manager",
      "Custom integrations",
    ],
  },
];

type FeatureCell = boolean | string;

const featureRows: { label: string; starter: FeatureCell; pro: FeatureCell; premium: FeatureCell; billions: FeatureCell }[] = [
  { label: "Digital assistant platform",       starter: true,   pro: true,    premium: true,    billions: true     },
  { label: "Email lead delivery",             starter: true,   pro: true,    premium: true,    billions: true     },
  { label: "POPIA compliant",                 starter: true,   pro: true,    premium: true,    billions: true     },
  { label: "Email support",                   starter: true,   pro: true,    premium: true,    billions: true     },
  { label: "Qualified leads / month",         starter: "75",   pro: "250",   premium: "1,000", billions: "5,000"  },
  { label: '"Powered by Qwikly" branding',   starter: true,   pro: false,   premium: false,   billions: false    },
  { label: "Custom branding (your logo)",     starter: false,  pro: true,    premium: true,    billions: true     },
  { label: "Custom greeting & questions",     starter: false,  pro: true,    premium: true,    billions: true     },
  { label: "Lead exports (CSV)",              starter: false,  pro: true,    premium: true,    billions: true     },
  { label: "Priority email support",          starter: false,  pro: true,    premium: true,    billions: true     },
  { label: "Calendar integration",            starter: false,  pro: false,   premium: "Soon",  billions: true     },
  { label: "API access",                      starter: false,  pro: false,   premium: true,    billions: true     },
  { label: "Dedicated support",              starter: false,  pro: false,   premium: true,    billions: true     },
  { label: "White-label (no Qwikly)",        starter: false,  pro: false,   premium: false,   billions: true     },
  { label: "Dedicated account manager",      starter: false,  pro: false,   premium: false,   billions: true     },
];

const pricingFAQs = [
  {
    question: "What counts as a qualified lead?",
    answer:
      "A qualified lead is a visitor who has provided their contact details and answered your qualifying questions: service type, location, and buying intent. Bounced chats and spam are not counted.",
  },
  {
    question: "What happens when I hit my monthly limit?",
    answer:
      "We'll notify you before you hit the cap. You can upgrade your plan, or add extra leads at R20 each. No automatic billing, no surprise charges, and your digital assistant keeps working until you decide.",
  },
  {
    question: "What happens after my 14-day trial?",
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
    question: "When will calendar integration launch?",
    answer:
      "Calendar integration is on the roadmap for Q3 2026. Premium plan subscribers will get early access when it launches. You'll be notified by email.",
  },
];

function TableCell({ value, isProCol }: { value: FeatureCell; isProCol?: boolean }) {
  if (typeof value === "string") {
    return (
      <span className={`font-display text-lg leading-none ${isProCol ? "text-ember" : "text-ink"}`}>
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

export default function PricingPage() {
  const [annual, setAnnual] = useState(false);
  const [openFAQ, setOpenFAQ] = useState<number | null>(null);

  function displayPrice(id: TierId) {
    if (id === "trial") return 0;
    return annual ? Math.round(ANNUAL[id] / 12) : MONTHLY[id];
  }

  return (
    <div className="bg-paper">

      {/* ─── HERO ─── */}
      <section className="relative pt-36 pb-16 md:pt-44 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">Pricing</p>
          <h1 className="display-xl text-ink max-w-[18ch]">
            No per-job fees.{" "}
            <em className="italic font-light">Ever.</em>
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-xl leading-relaxed">
            Start with a 14-day trial. Scale when you&apos;re ready.
            Flat ZAR pricing, no commissions, no setup fees, cancel anytime.
          </p>
        </div>
      </section>

      {/* ─── TOGGLE + TIER CARDS ─── */}
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

          {/* Tier cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 items-stretch">
            {tiers.map((tier) => {
              const price = displayPrice(tier.id);

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col ${
                    tier.highlight
                      ? "ed-card-ink"
                      : tier.id === "premium"
                      ? "ed-card"
                      : "ed-card-ghost"
                  } ${tier.highlight ? "pt-10" : ""}`}
                >
                  {/* Most Popular badge */}
                  {tier.highlight && (
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                      <span className="eyebrow bg-ember text-paper px-4 py-1.5 rounded-full whitespace-nowrap">
                        Most Popular
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
                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span
                        className={`font-display font-medium leading-none ${tier.highlight ? "text-paper" : "text-ink"}`}
                        style={{ fontSize: "clamp(2.4rem, 4vw, 3rem)" }}
                      >
                        {tier.id === "trial" ? "Free" : `R${price.toLocaleString()}`}
                      </span>
                      {tier.id !== "trial" && (
                        <span className={`text-sm ${tier.highlight ? "text-paper/50" : "text-ink-500"}`}>/mo</span>
                      )}
                    </div>
                    {tier.id !== "trial" && (
                      <p className={`text-xs mt-2 ${tier.highlight ? "text-paper/45" : "text-ink-400"}`}>
                        {annual
                          ? `Billed R${ANNUAL[tier.id].toLocaleString()}/year`
                          : "Billed monthly"}
                      </p>
                    )}
                    {tier.id === "trial" && (
                      <p className={`text-xs mt-2 ${tier.highlight ? "text-paper/45" : "text-ink-400"}`}>
                        14 days · No card required
                      </p>
                    )}
                  </div>

                  {/* Feature list */}
                  <ul className="flex-1 space-y-3 mb-8">
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

                  <CTAButton
                    href={`/signup?plan=${tier.id}`}
                    variant={tier.highlight ? "solid" : "primary"}
                    size="md"
                    className="w-full justify-center"
                  >
                    {tier.cta}
                  </CTAButton>
                </div>
              );
            })}
          </div>

          <p className="text-center eyebrow text-ink-500 mt-10">
            30-day money-back guarantee on Pro &amp; Premium · Top-ups at R20/extra lead · Cancel anytime · All prices excl. VAT
          </p>
        </div>
      </section>

      {/* ─── COMPARISON TABLE ─── */}
      <section className="py-28 bg-paper-deep grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14">
            <p className="eyebrow text-ink-500 mb-6">Compare plans</p>
            <h2 className="display-lg text-ink max-w-[20ch]">
              Everything,
              <br />
              <em className="italic font-light">side by side</em>.
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse min-w-[620px]">
              <thead>
                <tr className="border-b border-ink/10">
                  <th className="text-left pb-5 pr-6 font-normal eyebrow text-ink-500 w-[38%]">
                    Feature
                  </th>
                  <th className="pb-5 px-4 text-center font-normal eyebrow text-ink-500">
                    Starter
                  </th>
                  <th className="pb-5 px-4 text-center font-normal">
                    <span className="eyebrow text-ember">Pro</span>
                  </th>
                  <th className="pb-5 px-4 text-center font-normal eyebrow text-ink-500">
                    Premium
                  </th>
                  <th className="pb-5 px-4 text-center font-normal eyebrow text-ink-500">
                    Billions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {featureRows.map((row) => (
                  <tr key={row.label} className="hover:bg-ink/[0.015] transition-colors">
                    <td className="py-4 pr-6 text-sm text-ink-700 leading-snug">
                      {row.label}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <TableCell value={row.starter} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <TableCell value={row.pro} isProCol />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <TableCell value={row.premium} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <TableCell value={row.billions} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ─── 30-DAY GUARANTEE ─── */}
      <section className="py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="ed-card max-w-3xl mx-auto text-center">
            <div className="w-12 h-12 rounded-full bg-ember/10 flex items-center justify-center mx-auto mb-6">
              <Shield className="w-6 h-6 text-ember" strokeWidth={1.5} />
            </div>
            <p className="eyebrow text-ember mb-4">30-day money-back guarantee</p>
            <h2 className="display-md text-ink mb-6">
              If Qwikly doesn&rsquo;t deliver,
              <br className="hidden md:block" />{" "}
              <em className="italic font-light">you pay nothing</em>.
            </h2>
            <p className="text-ink-700 leading-relaxed max-w-lg mx-auto">
              Try Pro or Premium for 30 days. If you&rsquo;re not happy for any reason,
              we&rsquo;ll refund every cent. No hoops, no questions asked.
              (Starter is free. No guarantee needed.)
            </p>
          </div>
        </div>
      </section>

      {/* ─── TOP-UPS EXPLAINER ─── */}
      <section className="py-16 bg-paper-deep grain border-t border-b border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="max-w-lg">
              <p className="eyebrow text-ember mb-3">Need more leads?</p>
              <h3 className="font-display text-2xl text-ink mb-2">Top-ups at R20 per extra qualified lead.</h3>
              <p className="text-ink-700 text-sm leading-relaxed">
                Hit your monthly cap? Add extra leads one by one at R20 each. No plan change required.
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

      {/* ─── PRICING FAQ ─── */}
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
                          isOpen ? "max-h-64 pb-8" : "max-h-0"
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

      {/* ─── TRUST STRIP ─── */}
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
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section className="relative py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[18ch] mx-auto">
            Ready to stop{" "}
            <em className="italic font-light text-ember">losing leads</em>?
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            Free to start. Live in 5 minutes. No per-job fees, ever.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton size="lg" variant="solid" href="/signup?plan=pro">
              Start with Pro
            </CTAButton>
            <CTAButton size="lg" variant="outline-light" href="/signup?plan=starter" withArrow={false}>
              Start Free
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
