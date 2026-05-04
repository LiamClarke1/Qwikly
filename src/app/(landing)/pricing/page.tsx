"use client";

import { useState } from "react";
import { Check, Minus, Plus, Shield, MapPin, Clock, Zap, Users, TrendingDown, MessageSquare, Phone, X } from "lucide-react";
import CTAButton from "@/components/CTAButton";

const MONTHLY = { trial: 0, pro: 999, premium: 1999, billions: 2999 } as const;
const ANNUAL  = { trial: 0, pro: 10188, premium: 20390, billions: 30590 } as const;

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
    tagline: "14 days free. Identical to Pro.",
    highlight: false,
    cta: "Start 14-day trial",
    features: [
      "75 qualified leads/month",
      "Full Pro features — identical",
      "Digital assistant + embed snippet",
      "Custom branding + questions",
      "No card required",
      "Upgrade anytime",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    tagline: "For businesses getting started",
    highlight: false,
    cta: "Start with Pro",
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
    id: "premium",
    name: "Premium",
    tagline: "For businesses ready to grow",
    highlight: true,
    cta: "Start with Premium",
    features: [
      "250 qualified leads/month",
      "Everything in Pro, plus:",
      "Custom branding (your logo, no Qwikly)",
      "Custom greeting + qualifying questions",
      "Lead exports (CSV)",
      "Priority email support",
    ],
  },
  {
    id: "billions",
    name: "Billions",
    tagline: "Full scale, full control",
    highlight: false,
    cta: "Start with Billions",
    features: [
      "1,000 qualified leads/month",
      "Everything in Premium, plus:",
      "Calendar integration (coming soon)",
      "API access",
      "Dedicated support",
    ],
  },
];

type FeatureCell = boolean | string;

const featureRows: { label: string; pro: FeatureCell; premium: FeatureCell; billions: FeatureCell }[] = [
  { label: "Digital assistant platform",       pro: true,    premium: true,    billions: true     },
  { label: "Email lead delivery",              pro: true,    premium: true,    billions: true     },
  { label: "POPIA compliant",                  pro: true,    premium: true,    billions: true     },
  { label: "Email support",                    pro: true,    premium: true,    billions: true     },
  { label: "Qualified leads / month",          pro: "75",    premium: "250",   billions: "1,000"  },
  { label: '"Powered by Qwikly" branding',    pro: true,    premium: false,   billions: false    },
  { label: "Custom branding (your logo)",      pro: false,   premium: true,    billions: true     },
  { label: "Custom greeting & questions",      pro: false,   premium: true,    billions: true     },
  { label: "Lead exports (CSV)",               pro: false,   premium: true,    billions: true     },
  { label: "Priority email support",           pro: false,   premium: true,    billions: true     },
  { label: "Calendar integration",             pro: false,   premium: false,   billions: "Soon"   },
  { label: "API access",                       pro: false,   premium: false,   billions: true     },
  { label: "Dedicated support",               pro: false,   premium: false,   billions: true     },
];

const pricingFAQs = [
  {
    question: "What counts as a qualified lead?",
    answer:
      "A lead is counted only when a visitor shares their phone number or email address. Someone who opens the chat, says hi, or gives only their name does not count. Bounced chats, bots, and your own test messages never count. You only pay for people you can actually reach.",
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
            {tiers.map((tier) => {
              const price = displayPrice(tier.id);

              return (
                <div
                  key={tier.id}
                  className={`relative flex flex-col ${
                    tier.highlight ? "ed-card-ink" : "ed-card-ghost"
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
            Top-ups at R20/extra lead · Cancel anytime · All prices excl. VAT
          </p>
        </div>
      </section>

      {/* ─── VALUE JUSTIFICATION ─── */}
      <section className="py-28 bg-paper-deep grain overflow-hidden">
        <div className="mx-auto max-w-site px-6 lg:px-10">

          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">What your money is actually buying</p>
            <h2 className="display-lg text-ink">
              Not signing up
              <br />
              <em className="italic font-light">is the more expensive choice.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-xl">
              Every enquiry that goes unanswered is a job you didn&apos;t book.
              The question isn&apos;t whether R999 a month is worth it — it&apos;s how much losing leads is costing you right now.
            </p>
          </div>

          {/* Cost comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-20">

            {/* Without Qwikly */}
            <div className="ed-card space-y-5">
              <p className="eyebrow text-ink-500 mb-6">Without Qwikly</p>
              {[
                { Icon: Users,        text: "Hiring someone to answer enquiries: R4,000 – R8,000/month" },
                { Icon: Clock,        text: "After-hours enquiries wait until morning — your competitor picks up the phone" },
                { Icon: TrendingDown, text: "No record of leads lost, no visibility on what you're missing" },
                { Icon: Zap,          text: "First to respond wins the job. If it isn't you, it's your competitor" },
              ].map(({ Icon, text }, i) => (
                <div key={i} className="flex items-start gap-3">
                  <span className="w-8 h-8 rounded-full bg-ink/8 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Icon className="w-4 h-4 text-ink-400" strokeWidth={2} aria-hidden="true" />
                  </span>
                  <p className="text-ink-700 text-sm leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* With Qwikly */}
            <div className="ed-card-ink space-y-5">
              <p className="eyebrow text-ember mb-6">With Qwikly Pro — R999/month</p>
              {[
                "Qualified leads land in your inbox — no staff required",
                "Responds instantly, 24/7, including weekends and public holidays",
                "No sick days, no lunch breaks, no missed calls after 5pm",
                "Full conversation log and lead history in your dashboard",
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
                stat: "30 min",
                label: "Most leads go cold within 30 minutes of an unanswered enquiry.",
              },
              {
                stat: "R0",
                label: "Per-job commission Qwikly takes. Every rand you earn stays yours.",
              },
              {
                stat: "24/7",
                label: "Your digital assistant is live — even when your phone is off.",
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
            <p className="eyebrow text-ink-500 mb-6">14 days free — no card required</p>
            <CTAButton href="/signup?plan=trial" variant="primary" size="lg">
              Start your free trial
            </CTAButton>
          </div>

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
                  <th className="text-left pb-5 pr-6 font-normal eyebrow text-ink-500 w-[40%]">
                    Feature
                  </th>
                  <th className="pb-5 px-4 text-center font-normal eyebrow text-ink-500">
                    Pro
                  </th>
                  <th className="pb-5 px-4 text-center font-normal">
                    <span className="eyebrow text-ember">Premium</span>
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
                      <TableCell value={row.pro} />
                    </td>
                    <td className="py-4 px-4 text-center">
                      <TableCell value={row.premium} isPremiumCol />
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

      {/* ─── WHAT IS A LEAD ─── */}
      <section className="py-28 bg-paper grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">

          {/* Header */}
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

          {/* Three stages */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

            {/* Stage 1 */}
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

            {/* Stage 2 */}
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

            {/* Stage 3 */}
            <div className="rounded-2xl border border-ink/[0.08] bg-white p-8">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center mb-6">
                <Zap className="w-5 h-5 text-green-600" strokeWidth={1.75} aria-hidden="true" />
              </div>
              <p className="eyebrow text-ink-400 mb-3">Stage 3</p>
              <h3 className="font-display text-2xl text-ink mb-3">Booking intent</h3>
              <p className="text-ink-600 text-sm leading-relaxed mb-6">
                Visitor confirms they want a callback, meeting, or is heading to sign up. Flagged as
                "Hot" in your dashboard so you know who to call first. Still only 1 lead, no extra charge.
              </p>
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/10 border border-green-500/20">
                <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                <span className="eyebrow text-xs text-green-700">Hot, still 1 lead</span>
              </span>
            </div>

          </div>

          {/* What doesn't count */}
          <div className="rounded-2xl border border-ink/[0.08] bg-ink/[0.02] p-8 md:p-12">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <p className="eyebrow text-ink-500 mb-4">What never counts</p>
                <h3 className="font-display text-2xl text-ink mb-4">
                  Bounced chats don&rsquo;t touch your limit.
                </h3>
                <p className="text-ink-700 text-sm leading-relaxed">
                  If a visitor opens the chat and leaves without sharing contact details, we don&rsquo;t count it.
                  Spam, bots, test messages, and visitors who only give their name — none of these
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
            <CTAButton size="lg" variant="solid" href="/signup?plan=premium">
              Start with Premium
            </CTAButton>
            <CTAButton size="lg" variant="outline-light" href="/signup?plan=trial" withArrow={false}>
              Start Free
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
