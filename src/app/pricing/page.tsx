"use client";

import { useState, useMemo } from "react";
import { CheckCircle2, Calculator } from "lucide-react";
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
    cost: "8% per booking",
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
    <main className="bg-background">
      {/* Hero */}
      <section className="pt-8 pb-16">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="One Simple Rule: 8% of the Service Price"
            subtitle="You list your services and prices. When Qwikly books a customer for a specific service, we take 8%. Different services, different fees. Always fair."
          />
        </div>
      </section>

      {/* The Rule */}
      <section className="pb-16">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-[#0F172A] to-[#1E293B] rounded-2xl p-8 text-center">
            <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold mb-2">Per booking fee</p>
            <p className="font-heading text-6xl md:text-7xl font-bold text-cta">8%</p>
            <p className="text-gray-300 mt-2 text-lg">of the service price your customer books</p>
            <div className="flex items-center justify-center gap-6 mt-6 text-sm text-gray-400">
              <span>Minimum <span className="text-white font-semibold">R150</span> per booking</span>
              <span className="text-gray-600">|</span>
              <span>Maximum <span className="text-white font-semibold">R5,000</span> per booking</span>
            </div>
          </div>
        </div>
      </section>

      {/* Calculator */}
      <section className="pb-20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="max-w-xl mx-auto bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="bg-gradient-to-r from-[#0F172A] to-[#1E293B] px-6 py-4 flex items-center gap-3">
              <Calculator className="w-5 h-5 text-cta" />
              <h3 className="text-white font-heading font-semibold">Calculate your per-booking fee</h3>
            </div>
            <div className="p-6">
              <label className="block text-sm font-medium text-foreground mb-2">
                Enter any service price your business charges (in Rands)
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-semibold">R</span>
                <input
                  type="text"
                  placeholder="e.g. 5000"
                  value={calcPrice}
                  onChange={(e) => setCalcPrice(e.target.value)}
                  className="w-full pl-10 pr-4 py-4 rounded-lg border border-border bg-background text-foreground text-lg font-semibold focus:outline-none focus:ring-2 focus:ring-cta/40 focus:border-cta transition-colors"
                />
              </div>

              {calcResult && (
                <div className="mt-6 space-y-4">
                  <div className="bg-[#f8fafc] rounded-xl p-6 border border-border text-center">
                    <p className="text-sm text-muted mb-1">Your per-booking fee for this service</p>
                    <p className="font-heading text-4xl font-bold text-cta">
                      R{calcResult.fee.toLocaleString()}
                    </p>
                    <p className="text-sm text-muted mt-1">
                      {calcResult.percent}% of R{calcResult.servicePrice.toLocaleString()}
                      {calcResult.fee === 150 && " (minimum applies)"}
                      {calcResult.fee === 5000 && " (maximum applies)"}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-[#f8fafc] rounded-xl p-4 border border-border text-center">
                      <p className="text-xs text-muted mb-1">You earn</p>
                      <p className="font-heading text-xl font-bold text-foreground">
                        R{(calcResult.servicePrice - calcResult.fee).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted">after Qwikly fee</p>
                    </div>
                    <div className="bg-[#f8fafc] rounded-xl p-4 border border-border text-center">
                      <p className="text-xs text-muted mb-1">At 10 bookings/month</p>
                      <p className="font-heading text-xl font-bold text-green-600">
                        R{(10 * (calcResult.servicePrice - calcResult.fee)).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted">net revenue</p>
                    </div>
                  </div>

                  <CTAButton size="lg" className="w-full justify-center">
                    Start Your Free 7-Day Trial
                  </CTAButton>
                </div>
              )}

              <div className="mt-6 bg-cta/5 rounded-lg p-4 border border-cta/20">
                <p className="text-xs text-foreground leading-relaxed">
                  <strong>How it works:</strong> During onboarding, you list every service you offer and what you charge for it.
                  The AI uses these prices when talking to your leads. When a booking is made, the fee is calculated from the
                  specific service booked. If you offer a R1,500 drain unblock and a R8,000 geyser replacement, those
                  have different fees. If your prices go up later, the fees adjust to match.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real Examples Table */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Real Examples Across Industries"
            subtitle="See exactly what different businesses pay for different services."
          />

          <div className="mt-12 max-w-3xl mx-auto bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
            <div className="grid grid-cols-4 px-6 py-3 bg-gradient-to-r from-[#0F172A] to-[#1E293B]">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Business</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Service</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-center">Service Price</span>
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-400 text-right">Qwikly Fee (8%)</span>
            </div>
            <div className="divide-y divide-border">
              {serviceExamples.map((item, i) => (
                <div key={i} className="grid grid-cols-4 items-center px-6 py-3 hover:bg-cta/5 transition-colors duration-200">
                  <span className="text-sm text-muted">{item.business}</span>
                  <span className="text-sm font-medium text-foreground">{item.service}</span>
                  <span className="text-center text-sm text-muted">R{item.price.toLocaleString()}</span>
                  <span className="text-right text-sm font-bold text-cta">
                    R{item.fee.toLocaleString()}
                    {item.fee === 150 && <span className="text-[10px] text-muted ml-1">(min)</span>}
                    {item.fee === 5000 && <span className="text-[10px] text-muted ml-1">(max)</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="py-20 bg-[#f1f5f9]">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Every Business Gets the Full Platform"
            subtitle="Same features for everyone. No tiers, no upsells, no hidden costs."
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
                <h3 className={`font-heading text-lg font-semibold ${item.highlight ? "text-white" : "text-primary"}`}>
                  {item.title}
                </h3>
                <p className={`font-heading text-3xl font-bold mt-2 ${item.highlight ? "text-cta" : "text-foreground"}`}>
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
                    <li key={detail} className={`flex items-start gap-2 text-sm ${item.highlight ? "text-gray-300" : "text-muted"}`}>
                      <span className="text-red-400 flex-shrink-0 mt-0.5">&#x2715;</span>
                      {detail}
                    </li>
                  ))}
                </ul>
                {item.highlight && (
                  <div className="mt-6">
                    <CTAButton size="md" className="w-full justify-center">
                      Start Free Trial
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
