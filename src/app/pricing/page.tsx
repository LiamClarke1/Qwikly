"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, ArrowRight, Calculator, MessageCircle } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import CTAButton from "@/components/CTAButton";
import FAQ from "@/components/FAQ";

const allFeatures = [
  "30-second WhatsApp response",
  "Email lead handling",
  "Automated follow-ups (4h, 24h, 2d, 5d)",
  "No-show recovery",
  "Quote follow-ups",
  "Lead revival (30+ day dormant leads)",
  "Appointment reminders (24h + 1h)",
  "Multi-channel (WhatsApp + Email)",
  "Client dashboard with conversation transcripts",
  "Trade-specific AI",
  "7-day free trial",
];

const tradePricing = [
  { trade: "Pest Control", price: 200, jobValue: 1500, jobLabel: "R1,500", recurring: false },
  { trade: "Pool Cleaning", price: 400, jobValue: 1800, jobLabel: "R1,800/mo", recurring: true },
  { trade: "Plumber", price: 500, jobValue: 5000, jobLabel: "R5,000", recurring: false },
  { trade: "Electrician", price: 500, jobValue: 7000, jobLabel: "R7,000", recurring: false },
  { trade: "Security", price: 750, jobValue: 1000, jobLabel: "R1,000/mo", recurring: true },
  { trade: "Aircon / HVAC", price: 600, jobValue: 8000, jobLabel: "R8,000", recurring: false },
  { trade: "Landscaper", price: 750, jobValue: 10000, jobLabel: "R10,000", recurring: false },
  { trade: "Garage Doors", price: 1000, jobValue: 12000, jobLabel: "R12,000", recurring: false },
  { trade: "Roofer", price: 2000, jobValue: 40000, jobLabel: "R40,000", recurring: false },
  { trade: "Solar Installer", price: 5000, jobValue: 150000, jobLabel: "R150,000", recurring: false },
];

const comparisons = [
  {
    title: "Receptionist",
    cost: "R6-12k/month",
    highlight: false,
    pros: [],
    cons: [
      "Works 8am-4pm only",
      "No weekends or after-hours",
      "Salary + UIF + leave",
      "Can't handle 5 leads at once",
      "No automated follow-ups",
    ],
  },
  {
    title: "WhatsApp Auto-Reply",
    cost: "Free",
    highlight: false,
    pros: [],
    cons: [
      "Generic 'we'll get back to you'",
      "No qualification",
      "No booking",
      "No follow-ups",
      "Customer knows it's useless",
    ],
  },
  {
    title: "Qwikly",
    cost: "From R200/booking",
    highlight: true,
    pros: [
      "Available 24/7, every day",
      "Qualifies + books automatically",
      "Email + WhatsApp",
      "Automated follow-ups + revival",
      "Sounds human, not robotic",
    ],
    cons: [],
  },
];

export default function PricingPage() {
  const [selectedTrade, setSelectedTrade] = useState(2); // Default to Plumber
  const [customJobValue, setCustomJobValue] = useState("");
  const [customIndustry, setCustomIndustry] = useState("");

  const trade = tradePricing[selectedTrade];
  const bookingsPerMonth = 10;
  const revenue = bookingsPerMonth * trade.jobValue;
  const cost = bookingsPerMonth * trade.price;
  const roi = Math.round((revenue / cost) * 100);

  // Custom calculator: 8% of declared job value, minimum R200, maximum R5,000
  const customCalc = useMemo(() => {
    const val = parseFloat(customJobValue.replace(/[^0-9.]/g, ""));
    if (!val || val <= 0) return null;
    const raw = Math.round(val * 0.08);
    const fee = Math.max(200, Math.min(5000, Math.round(raw / 50) * 50)); // Round to nearest R50
    const monthlyRevenue = bookingsPerMonth * val;
    const monthlyCost = bookingsPerMonth * fee;
    const calcRoi = Math.round((monthlyRevenue / monthlyCost) * 100);
    return { fee, monthlyRevenue, monthlyCost, calcRoi, jobValue: val };
  }, [customJobValue]);

  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="pt-8 pb-16">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Priced for Your Trade. Pay Per Booking."
            subtitle="Every trade has different job values, so every trade gets a fair price. You only pay when Qwikly books a real appointment."
          />
        </div>
      </section>

      {/* Trade Pricing Table */}
      <section className="pb-20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4">
              <div className="grid grid-cols-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                <span>Your Trade</span>
                <span className="text-center">Per Booking</span>
                <span className="text-center">Avg Job Value</span>
                <span className="text-right">ROI per Booking</span>
              </div>
            </div>
            <div className="divide-y divide-border">
              {tradePricing.map((item, i) => {
                const itemRoi = Math.round(item.jobValue / item.price);
                return (
                  <button
                    key={item.trade}
                    onClick={() => setSelectedTrade(i)}
                    className={`w-full grid grid-cols-4 items-center px-6 py-4 transition-colors duration-200 cursor-pointer text-left ${
                      selectedTrade === i
                        ? "bg-cta/10 border-l-4 border-cta"
                        : "hover:bg-[#f8fafc]"
                    }`}
                  >
                    <span className={`text-sm font-medium ${selectedTrade === i ? "text-cta font-bold" : "text-foreground"}`}>
                      {item.trade}
                    </span>
                    <span className="text-center text-sm font-bold text-cta">
                      R{item.price.toLocaleString()}
                    </span>
                    <span className="text-center text-sm text-muted">
                      {item.jobLabel}
                    </span>
                    <span className="text-right text-sm font-bold text-green-600">
                      {itemRoi}x return
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="px-6 py-3 bg-[#f8fafc] border-t border-border">
              <p className="text-xs text-muted text-center">
                Click a trade above to see your ROI breakdown below.
              </p>
            </div>
          </div>

          {/* Custom Industry Calculator */}
          <div className="mt-10 max-w-3xl mx-auto bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4 flex items-center gap-3">
              <Calculator className="w-5 h-5 text-cta" />
              <h3 className="text-white font-heading font-semibold">
                Don&apos;t see your industry? Calculate your price.
              </h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-muted mb-6">
                Your per-booking fee is based on what you charge your customers. Enter your average service price and we&apos;ll show you exactly what Qwikly costs.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Your industry</label>
                  <input
                    type="text"
                    placeholder="e.g. Dentist, Beauty Salon, Auto Mechanic"
                    value={customIndustry}
                    onChange={(e) => setCustomIndustry(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cta/40 focus:border-cta transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">Average service/job price (Rands)</label>
                  <input
                    type="text"
                    placeholder="e.g. 3000"
                    value={customJobValue}
                    onChange={(e) => setCustomJobValue(e.target.value)}
                    className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-cta/40 focus:border-cta transition-colors"
                  />
                </div>
              </div>

              {customCalc && (
                <div className="space-y-3">
                  <div className="bg-[#f8fafc] rounded-xl p-5 border border-border">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted">Your per-booking fee</span>
                      <span className="font-heading text-3xl font-bold text-cta">
                        R{customCalc.fee.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted">At 10 bookings/month, you pay</span>
                      <span className="font-heading text-lg font-bold text-foreground">
                        R{customCalc.monthlyCost.toLocaleString()}/month
                      </span>
                    </div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm text-muted">Revenue those bookings generate</span>
                      <span className="font-heading text-lg font-bold text-green-600">
                        R{customCalc.monthlyRevenue.toLocaleString()}/month
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <span className="text-sm font-semibold text-foreground">Your ROI</span>
                      <span className="font-heading text-2xl font-bold text-green-600">
                        {customCalc.calcRoi}%
                      </span>
                    </div>
                  </div>

                  <div className="bg-cta/5 rounded-lg p-4 border border-cta/20">
                    <p className="text-xs text-foreground leading-relaxed">
                      <strong>How this works:</strong> Your per-booking fee is calculated at ~8% of your average service price.
                      During onboarding, you&apos;ll enter the actual prices you charge customers. The AI uses these prices when
                      talking to leads, and your per-booking fee is tied to them. If your service prices change, your booking fee
                      adjusts to match. This keeps pricing fair for everyone.
                    </p>
                  </div>

                  <div className="text-center pt-2">
                    <CTAButton size="md">
                      Get Started with {customIndustry || "Your Business"}
                    </CTAButton>
                  </div>
                </div>
              )}

              {!customCalc && (
                <div className="flex items-center gap-3 pt-2">
                  <MessageCircle className="w-5 h-5 text-cta flex-shrink-0" />
                  <p className="text-sm text-muted">
                    Prefer to chat? Message us on{" "}
                    <a href="https://wa.me/27000000000" className="text-cta hover:underline cursor-pointer">
                      WhatsApp
                    </a>{" "}
                    and we&apos;ll work out your pricing together.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Interactive ROI Calculator */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="The Math Is Simple"
            subtitle={`Here's what ${bookingsPerMonth} bookings per month looks like for a ${trade.trade.toLowerCase()}`}
          />

          <div className="mt-12 max-w-2xl mx-auto space-y-4">
            <div className="bg-card rounded-xl p-6 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-muted">Your Qwikly investment</span>
              <div className="text-right">
                <span className="text-sm text-muted">
                  {bookingsPerMonth} x R{trade.price.toLocaleString()} ={" "}
                </span>
                <span className="font-heading text-2xl font-bold text-foreground">
                  R{cost.toLocaleString()}/month
                </span>
              </div>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-muted">Average {trade.trade.toLowerCase()} job value</span>
              <span className="font-heading text-2xl font-bold text-foreground sm:text-right">
                {trade.jobLabel}
              </span>
            </div>

            <div className="bg-card rounded-xl p-6 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-muted">New revenue from Qwikly bookings</span>
              <div className="text-right">
                <span className="text-sm text-muted">
                  {bookingsPerMonth} x {trade.jobLabel} ={" "}
                </span>
                <span className="font-heading text-2xl font-bold text-green-600">
                  R{revenue.toLocaleString()}/month
                </span>
              </div>
            </div>

            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-gray-300 font-semibold">Return on Investment</span>
              <span className="font-heading text-4xl font-bold text-cta">
                {roi}%
              </span>
            </div>

            <p className="text-center text-sm text-muted mt-4">
              Click a trade in the table above to see your specific ROI
            </p>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 bg-[#f1f5f9]">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Every Trade Gets the Full Platform"
            subtitle="Same features, fair pricing. No tiers, no upsells, no hidden costs."
          />

          <div className="mt-12 max-w-lg mx-auto bg-card rounded-2xl shadow-xl border border-border p-8">
            <ul className="space-y-3">
              {allFeatures.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{item}</span>
                </li>
              ))}
            </ul>

            <div className="w-full h-px bg-border my-6" />

            <p className="text-sm text-muted text-center mb-6">
              No monthly fees. No setup cost. No contracts.
            </p>

            <CTAButton size="lg" className="w-full justify-center">
              Start Your Free 7-Day Trial
            </CTAButton>
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="How Qwikly Compares"
            subtitle="See what you're paying now versus what you could have."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {comparisons.map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl p-6 sm:p-8 ${
                  item.highlight
                    ? "bg-gradient-to-br from-[#0F172A] to-[#1E293B] text-white ring-2 ring-cta relative"
                    : "bg-card border border-border"
                }`}
              >
                {item.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cta text-white text-xs font-bold px-3 py-1 rounded-full">
                    RECOMMENDED
                  </span>
                )}
                <h3
                  className={`font-heading text-lg font-semibold ${
                    item.highlight ? "text-white" : "text-primary"
                  }`}
                >
                  {item.title}
                </h3>
                <p
                  className={`font-heading text-3xl font-bold mt-2 ${
                    item.highlight ? "text-cta" : "text-foreground"
                  }`}
                >
                  {item.cost}
                </p>

                <ul className="mt-6 space-y-3">
                  {item.pros.map((detail) => (
                    <li key={detail} className="flex items-start gap-2 text-sm text-gray-300">
                      <CheckCircle2 className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                      {detail}
                    </li>
                  ))}
                  {item.cons.map((detail) => (
                    <li
                      key={detail}
                      className={`flex items-start gap-2 text-sm ${
                        item.highlight ? "text-gray-300" : "text-muted"
                      }`}
                    >
                      <span className="text-red-400 flex-shrink-0 mt-0.5">✕</span>
                      {detail}
                    </li>
                  ))}
                </ul>

                {item.highlight && (
                  <div className="mt-6">
                    <CTAButton size="md" className="w-full justify-center">
                      Start Free Trial <ArrowRight className="w-4 h-4" />
                    </CTAButton>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A]">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">
            Ready to stop losing leads?
          </h2>
          <p className="mt-4 text-lg text-gray-400 max-w-xl mx-auto">
            Start your free 7-day trial. See the bookings come in. Only pay when it works.
          </p>
          <div className="mt-8">
            <CTAButton size="lg" className="cta-glow">
              Start Your Free 7-Day Trial
            </CTAButton>
          </div>
        </div>
      </section>
    </main>
  );
}
