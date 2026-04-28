"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import FAQ from "@/components/FAQ";

const allFeatures = [
  "30-second WhatsApp response",
  "Email lead handling",
  "Automated follow-ups at 4h, 24h, 2d, 5d",
  "No-show rebooking within minutes",
  "Quote follow-up sequences",
  "Dormant-lead revival at 30 days",
  "Reminders 24h and 1h before each job",
  "Multi-channel (WhatsApp + email)",
  "Client dashboard with conversation transcripts",
  "Trade-specific AI training",
  "7-day free trial",
];

const serviceExamples = [
  { business: "Pest Control", service: "Rat treatment", price: 1500, fee: 150 },
  { business: "Pool Cleaning", service: "Monthly maintenance", price: 1800, fee: 150 },
  { business: "Pool Cleaning", service: "Green pool cleanup", price: 2500, fee: 200 },
  { business: "Plumber", service: "Blocked drain", price: 1500, fee: 150 },
  { business: "Plumber", service: "Geyser replacement", price: 8000, fee: 640 },
  { business: "Electrician", service: "COC certificate", price: 2500, fee: 200 },
  { business: "Electrician", service: "DB board upgrade", price: 12000, fee: 960 },
  { business: "Dentist", service: "Check-up + clean", price: 1200, fee: 150 },
  { business: "Dentist", service: "Root canal", price: 6000, fee: 480 },
  { business: "Beauty Salon", service: "Full set nails", price: 800, fee: 150 },
  { business: "Auto Mechanic", service: "Full service", price: 4500, fee: 360 },
  { business: "Roofer", service: "Tile repair", price: 3500, fee: 280 },
  { business: "Roofer", service: "Full re-roof", price: 80000, fee: 5000 },
  { business: "Solar", service: "Full installation", price: 150000, fee: 5000 },
];

const comparisons = [
  {
    title: "A receptionist",
    cost: "R6,000 – R12,000 / month",
    lines: [
      "Works 8 a.m. – 4 p.m. only",
      "No weekends, no after-hours",
      "Salary, UIF, leave, sick days",
      "Can't juggle five leads at once",
      "No automated follow-ups",
    ],
    kind: "outline" as const,
  },
  {
    title: "A WhatsApp auto-reply",
    cost: "Free, and it shows.",
    lines: [
      "'We'll get back to you.' The customer knows.",
      "No qualification, no booking",
      "No follow-ups, ever",
      "Lead still goes to whoever replies first",
      "You pay in lost jobs, not rands",
    ],
    kind: "outline" as const,
  },
  {
    title: "Qwikly",
    cost: "8% per booked job",
    lines: [
      "On every day, every hour, every holiday",
      "Qualifies and books, start to finish",
      "WhatsApp and email, trained on your trade",
      "Follow-ups, no-show rescue, dormant revival",
      "Only earns when you earn",
    ],
    kind: "highlight" as const,
  },
];

export default function PricingPage() {
  const [calcPrice, setCalcPrice] = useState("");

  const calcResult = useMemo(() => {
    const val = parseFloat(calcPrice.replace(/[^0-9.]/g, ""));
    if (!val || val <= 0) return null;
    const raw = Math.round(val * 0.08);
    const fee = Math.max(150, Math.min(5000, Math.round(raw / 10) * 10));
    const percent = ((fee / val) * 100).toFixed(1);
    return { fee, percent, servicePrice: val };
  }, [calcPrice]);

  return (
    <main className="bg-paper">
      {/* ─── HERO — giant 8% ─── */}
      <section className="relative pt-36 pb-16 md:pt-44 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">Pricing</p>
          <h1 className="display-xl text-ink max-w-[18ch]">
            Only pays when{" "}
            <em className="italic font-light">you</em> get paid.
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-xl leading-relaxed">
            No subscription. No setup fee. No contract. Qwikly takes 8% when a
            booking lands in your calendar. Not a cent before that.
          </p>
        </div>
      </section>

      <section className="relative pb-28 overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="text-center">
            <p className="mega-num text-ink tracking-tight">
              8<span className="text-ember align-top text-[0.55em] ml-2">%</span>
            </p>
            <p className="font-display italic text-2xl md:text-3xl text-ink-700 mt-2 md:mt-0">
              of the service price, only when a job is booked.
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-center justify-center gap-6 sm:gap-16">
              <div>
                <p className="eyebrow text-ink-500">Minimum</p>
                <p className="font-display text-4xl text-ink mt-1">R150</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-ink/15" />
              <div>
                <p className="eyebrow text-ink-500">Cap</p>
                <p className="font-display text-4xl text-ink mt-1">R5,000</p>
              </div>
              <div className="hidden sm:block w-px h-12 bg-ink/15" />
              <div>
                <p className="eyebrow text-ember">Typical return</p>
                <p className="font-display text-4xl text-ink mt-1">10× – 50×</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CALCULATOR ─── */}
      <section className="relative pb-28 bg-paper-deep grain pt-28">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <p className="eyebrow text-ink-500 mb-6">Calculator</p>
              <h2 className="display-lg text-ink">
                Work out
                <br />
                <em className="italic font-light">your number</em>.
              </h2>
              <p className="mt-6 text-ink-700 leading-relaxed max-w-sm">
                Type any service price you charge. See exactly what Qwikly costs
                and what you keep.
              </p>
            </div>

            <div className="lg:col-span-7">
              <div className="ed-card">
                <div className="flex items-center gap-3 mb-6">
                  <Calculator className="w-5 h-5 text-ember" />
                  <p className="eyebrow text-ink-500">Per-booking fee</p>
                </div>
                <label className="block text-sm text-ink-700 mb-3">
                  Enter a service price (in Rand)
                </label>
                <div className="relative">
                  <span className="absolute left-5 top-1/2 -translate-y-1/2 text-ink-500 font-display text-xl">
                    R
                  </span>
                  <input
                    type="text"
                    placeholder="e.g. 5000"
                    value={calcPrice}
                    onChange={(e) => setCalcPrice(e.target.value)}
                    className="w-full pl-12 pr-4 py-5 rounded-xl border border-ink/15 bg-paper text-ink font-display text-2xl focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember transition-colors"
                  />
                </div>

                {calcResult && (
                  <div className="mt-8 space-y-4">
                    <div className="border border-ink/10 rounded-2xl p-6 bg-paper">
                      <p className="eyebrow text-ink-500">Your fee</p>
                      <p className="font-display text-5xl text-ember mt-1 num">
                        R{calcResult.fee.toLocaleString()}
                      </p>
                      <p className="text-sm text-ink-500 mt-2">
                        {calcResult.percent}% of R
                        {calcResult.servicePrice.toLocaleString()}
                        {calcResult.fee === 150 && " · minimum applies"}
                        {calcResult.fee === 5000 && " · cap applies"}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="border border-ink/10 rounded-2xl p-5 bg-paper">
                        <p className="eyebrow text-ink-500">You keep</p>
                        <p className="font-display text-2xl text-ink mt-1 num">
                          R
                          {(
                            calcResult.servicePrice - calcResult.fee
                          ).toLocaleString()}
                        </p>
                      </div>
                      <div className="border border-ink/10 rounded-2xl p-5 bg-paper">
                        <p className="eyebrow text-ink-500">
                          10 bookings / month
                        </p>
                        <p className="font-display text-2xl text-ink mt-1 num">
                          R
                          {(
                            10 *
                            (calcResult.servicePrice - calcResult.fee)
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <CTAButton size="md" className="w-full justify-center">
                      Claim your first booking
                    </CTAButton>
                  </div>
                )}

                <p className="mt-6 text-xs text-ink-500 leading-relaxed">
                  During onboarding you list every service you offer and what
                  you charge. Qwikly uses those prices when talking to leads,
                  so the fee always matches the specific job booked. Prices go up?
                  Fees adjust. You stay in control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── EXAMPLES ─── */}
      <section className="py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="flex items-baseline justify-between mb-14">
            <div>
              <p className="eyebrow text-ink-500 mb-5">Across the trades</p>
              <h2 className="display-lg text-ink max-w-[14ch]">
                Real numbers,
                <br />
                <em className="italic font-light">real businesses</em>.
              </h2>
            </div>
            <p className="eyebrow text-ink-500 hidden md:block">14 examples</p>
          </div>

          <div className="border-t border-b border-ink/10 divide-y divide-ink/10">
            <div className="hidden sm:grid grid-cols-12 px-4 py-4 eyebrow text-ink-500">
              <span className="col-span-3">Business</span>
              <span className="col-span-5">Service</span>
              <span className="col-span-2 text-right">Price</span>
              <span className="col-span-2 text-right">Fee (8%)</span>
            </div>
            {serviceExamples.map((item, i) => (
              <div
                key={i}
                className="grid grid-cols-12 px-4 py-5 items-baseline hover:bg-ink/[0.02] transition-colors"
              >
                <span className="col-span-12 sm:col-span-3 text-sm text-ink-500">
                  {item.business}
                </span>
                <span className="col-span-8 sm:col-span-5 font-display text-lg text-ink leading-snug">
                  {item.service}
                </span>
                <span className="col-span-4 sm:col-span-2 text-right text-sm text-ink-700 num">
                  R{item.price.toLocaleString()}
                </span>
                <span className="col-span-12 sm:col-span-2 text-right font-display text-lg text-ember num mt-1 sm:mt-0">
                  R{item.fee.toLocaleString()}
                  {item.fee === 150 && (
                    <span className="eyebrow text-ink-500 ml-2">min</span>
                  )}
                  {item.fee === 5000 && (
                    <span className="eyebrow text-ink-500 ml-2">cap</span>
                  )}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── EVERYTHING INCLUDED ─── */}
      <section className="py-28 bg-paper-deep grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-5">
              <p className="eyebrow text-ink-500 mb-6">What&rsquo;s included</p>
              <h2 className="display-lg text-ink">
                No tiers.
                <br />
                <em className="italic font-light">No add-ons</em>.
              </h2>
              <p className="mt-6 text-ink-700 max-w-sm leading-relaxed">
                Every business gets the full platform from day one. No upsells,
                no hidden costs, no surprises.
              </p>
              <div className="mt-8">
                <CTAButton size="lg">Claim your first booking</CTAButton>
              </div>
            </div>

            <div className="lg:col-span-7">
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 border-t border-ink/10 pt-6">
                {allFeatures.map((item, i) => (
                  <li
                    key={item}
                    className="flex items-start gap-4 text-ink-700 text-[0.95rem] leading-snug"
                  >
                    <span className="font-display italic text-ember text-sm num mt-0.5 min-w-[2ch]">
                      {(i + 1).toString().padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── COMPARISON ─── */}
      <section className="py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14">
            <p className="eyebrow text-ink-500 mb-5">The alternatives</p>
            <h2 className="display-lg text-ink max-w-[20ch]">
              What you&rsquo;re using now,
              <br />
              <em className="italic font-light">and what you could have</em>.
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {comparisons.map((c) => (
              <div
                key={c.title}
                className={
                  c.kind === "highlight" ? "ed-card-ink" : "ed-card-ghost"
                }
              >
                <p
                  className={`eyebrow mb-3 ${
                    c.kind === "highlight" ? "text-ember" : "text-ink-500"
                  }`}
                >
                  {c.title}
                </p>
                <p
                  className={`font-display text-3xl leading-tight ${
                    c.kind === "highlight" ? "text-paper" : "text-ink"
                  }`}
                >
                  {c.cost}
                </p>
                <ul className="mt-6 space-y-3">
                  {c.lines.map((line) => (
                    <li
                      key={line}
                      className={`flex gap-3 text-sm leading-relaxed ${
                        c.kind === "highlight" ? "text-paper/80" : "text-ink-700"
                      }`}
                    >
                      <span
                        className={
                          c.kind === "highlight" ? "text-ember" : "text-ember"
                        }
                      >
                        ·
                      </span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
                {c.kind === "highlight" && (
                  <div className="mt-8">
                    <CTAButton size="sm" variant="solid" className="w-full justify-center">
                      Start your trial
                    </CTAButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <FAQ />

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
            7 days free. No card held hostage. Pay only when a job is booked.
          </p>
          <div className="mt-12">
            <CTAButton size="lg" variant="solid">
              Claim your first booking
            </CTAButton>
          </div>
        </div>
      </section>
    </main>
  );
}
