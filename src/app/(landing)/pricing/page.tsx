"use client";

import { useState } from "react";
import { Check, Minus, Plus, Shield, MapPin } from "lucide-react";
import CTAButton from "@/components/CTAButton";

const MONTHLY = { lite: 399, pro: 799, business: 1499 } as const;
const ANNUAL  = { lite: 3990, pro: 7990, business: 14990 } as const;

type TierId = keyof typeof MONTHLY;

const tiers: {
  id: TierId;
  name: string;
  tagline: string;
  features: string[];
  highlight: boolean;
}[] = [
  {
    id: "lite",
    name: "Lite",
    tagline: "For sole traders just getting started",
    highlight: false,
    features: [
      "Up to 25 confirmed bookings/month",
      "WhatsApp replies in 30 seconds",
      "Auto job qualification",
      "Calendar booking + reminders",
      "Email support",
      "POPIA compliant",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For busy tradies who can't afford limits",
    highlight: true,
    features: [
      "Unlimited confirmed bookings",
      "Everything in Lite, plus:",
      "No-show recovery",
      "Web widget for your site",
      "Google + Outlook calendar sync",
      "Monthly performance report",
      "Priority WhatsApp support",
    ],
  },
  {
    id: "business",
    name: "Business",
    tagline: "For teams and growing operations",
    highlight: false,
    features: [
      "Everything in Pro, plus:",
      "Multi-user team accounts",
      "Custom branding in messages",
      "Quote / invoice handoff",
      "Xero + QuickBooks (Coming soon)",
      "Dedicated success manager",
      "API access",
    ],
  },
];

type FeatureCell = boolean | string;

const featureRows: { label: string; lite: FeatureCell; pro: FeatureCell; business: FeatureCell }[] = [
  { label: "WhatsApp replies in 30 seconds",  lite: true,        pro: true,        business: true        },
  { label: "Auto job qualification",           lite: true,        pro: true,        business: true        },
  { label: "Calendar booking + reminders",     lite: true,        pro: true,        business: true        },
  { label: "POPIA compliant",                  lite: true,        pro: true,        business: true        },
  { label: "Email support",                    lite: true,        pro: true,        business: true        },
  { label: "Confirmed bookings / month",       lite: "25",        pro: "Unlimited", business: "Unlimited" },
  { label: "No-show recovery",                 lite: false,       pro: true,        business: true        },
  { label: "Web widget for your site",         lite: false,       pro: true,        business: true        },
  { label: "Google + Outlook calendar sync",   lite: false,       pro: true,        business: true        },
  { label: "Monthly performance report",       lite: false,       pro: true,        business: true        },
  { label: "Priority WhatsApp support",        lite: false,       pro: true,        business: true        },
  { label: "Multi-user team accounts",         lite: false,       pro: false,       business: true        },
  { label: "Custom branding in messages",      lite: false,       pro: false,       business: true        },
  { label: "Quote / invoice handoff",          lite: false,       pro: false,       business: true        },
  { label: "Accounting integrations",          lite: false,       pro: false,       business: "Soon"      },
  { label: "Dedicated success manager",        lite: false,       pro: false,       business: true        },
  { label: "API access",                       lite: false,       pro: false,       business: true        },
];

const pricingFAQs = [
  {
    question: "Do I pay per booking?",
    answer:
      "No. Qwikly charges a flat monthly rate only. You pay the same amount whether you book 1 job or 100. No commissions, no per-job fees. Ever.",
  },
  {
    question: "What happens if I exceed 25 bookings on Lite?",
    answer:
      "We'll let you know when you're approaching your limit and prompt you to upgrade to Pro. You won't be charged extra or cut off mid-month, and there are no surprise fees.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. No contracts, no lock-in. Cancel from your dashboard at any time. Monthly plans end at the close of your current billing period.",
  },
  {
    question: "Do you take a cut of my jobs?",
    answer:
      "Never. Qwikly earns nothing from your bookings. Every rand you earn stays yours. That's the whole point of flat pricing.",
  },
  {
    question: "Is my data safe?",
    answer:
      "Yes. Qwikly is fully POPIA-compliant and your data is hosted in South Africa. We never sell your data or your customers' data to third parties.",
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
            One flat monthly rate. No commissions, no setup fees, no lock-in.
            Predictable costs built for South African tradies.
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
              Save 2 months
            </span>
          </div>

          {/* Tier cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {tiers.map((tier) => {
              const price = displayPrice(tier.id);

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col ${
                    tier.highlight
                      ? "ed-card-ink"
                      : tier.id === "business"
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
                      <span className={`font-display font-medium leading-none ${tier.highlight ? "text-paper" : "text-ink"}`}
                        style={{ fontSize: "clamp(2.4rem, 4vw, 3rem)" }}>
                        R{price.toLocaleString()}
                      </span>
                      <span className={`text-sm ${tier.highlight ? "text-paper/50" : "text-ink-500"}`}>/mo</span>
                    </div>
                    <p className={`text-xs mt-2 ${tier.highlight ? "text-paper/45" : "text-ink-400"}`}>
                      {annual
                        ? `Billed R${ANNUAL[tier.id].toLocaleString()}/year`
                        : "Billed monthly"}
                    </p>
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
                    Choose {tier.name}
                  </CTAButton>
                </div>
              );
            })}
          </div>

          <p className="text-center eyebrow text-ink-500 mt-10">
            30-day money-back guarantee · No setup fees · Cancel anytime
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
            <table className="w-full border-collapse min-w-[540px]">
              <thead>
                <tr className="border-b border-ink/10">
                  <th className="text-left pb-5 pr-6 font-normal eyebrow text-ink-500 w-[46%]">
                    Feature
                  </th>
                  <th className="pb-5 px-4 text-center font-normal eyebrow text-ink-500">
                    Lite
                  </th>
                  <th className="pb-5 px-4 text-center font-normal">
                    <span className="eyebrow text-ember">Pro</span>
                  </th>
                  <th className="pb-5 px-4 text-center font-normal eyebrow text-ink-500">
                    Business
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
                      <TableCell value={row.lite} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <TableCell value={row.pro} isProCol />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <TableCell value={row.business} />
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
              If Qwikly doesn&rsquo;t book more jobs than it costs,
              <br className="hidden md:block" />{" "}
              <em className="italic font-light">you pay nothing</em>.
            </h2>
            <p className="text-ink-700 leading-relaxed max-w-lg mx-auto">
              Try any plan for 30 days. If Qwikly doesn&rsquo;t generate more in
              booked work than your subscription fee, we&rsquo;ll refund every cent.
              No hoops, no questions asked.
            </p>
          </div>
        </div>
      </section>

      {/* ─── PRICING FAQ ─── */}
      <section className="py-28 bg-paper-deep grain">
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
              <svg
                className="w-5 h-5 text-ember"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="eyebrow text-ink-600">WhatsApp Business</span>
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
            Flat monthly pricing. No commissions, no per-job fees, no surprises.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton size="lg" variant="solid" href="/signup?plan=pro">
              Get started with Pro
            </CTAButton>
            <CTAButton size="lg" variant="outline-light" href="/signup?plan=lite" withArrow={false}>
              Start with Lite
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
