import { CheckCircle2 } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import CTAButton from "@/components/CTAButton";
import FAQ from "@/components/FAQ";

const features = [
  "30-second WhatsApp replies, 24/7",
  "Intelligent lead qualification",
  "Google Calendar booking",
  "Instant client notifications",
  "Full conversation logging",
  "Trade-specific AI training",
  "Dedicated onboarding support",
];

const comparisons = [
  {
    title: "Receptionist",
    cost: "R6-12k/month",
    details: [
      "8am-4pm only",
      "No weekends or after-hours",
      "Salary + benefits overhead",
    ],
  },
  {
    title: "WhatsApp Auto-Reply",
    cost: "Free",
    details: [
      "No lead qualification",
      "No appointment booking",
      "Feels robotic and generic",
    ],
  },
  {
    title: "Qwikly",
    cost: "R750/booking",
    highlight: true,
    details: [
      "Available 24/7, every day",
      "Qualifies + books automatically",
      "Sounds human and natural",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="pt-24 pb-16">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="Simple, Transparent Pricing"
            subtitle="No monthly fees. No setup costs. No contracts. Ever."
          />
        </div>
      </section>

      {/* Pricing Card */}
      <section className="pb-20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="max-w-lg mx-auto bg-card rounded-2xl shadow-lg border-t-4 border-cta p-8 sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-wider text-cta text-center">
              Pay Per Booking
            </p>

            <div className="text-center mt-6">
              <span className="font-heading text-5xl font-bold text-primary">
                R750
              </span>
              <p className="text-muted mt-2">per booked appointment</p>
            </div>

            <div className="w-full h-px bg-border my-8" />

            <ul className="space-y-4">
              {features.map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                  <span className="text-foreground">{feature}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 text-center">
              <CTAButton size="lg">Start Your Free 7-Day Trial</CTAButton>
            </div>
          </div>

          <p className="text-center text-muted text-sm mt-6">
            Try it free for 7 days. Cancel anytime. No credit card required.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="What You're Paying Now vs Qwikly"
            subtitle="See how Qwikly stacks up against the alternatives."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {comparisons.map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl p-6 sm:p-8 ${
                  item.highlight
                    ? "bg-primary text-white ring-2 ring-cta"
                    : "bg-card border border-border"
                }`}
              >
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
                  {item.details.map((detail) => (
                    <li
                      key={detail}
                      className={`text-sm ${
                        item.highlight ? "text-gray-300" : "text-muted"
                      }`}
                    >
                      {detail}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator */}
      <section className="py-20 bg-background">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading title="The Math Is Simple" />

          <div className="mt-12 max-w-2xl mx-auto">
            <p className="text-muted text-center text-lg mb-10">
              If Qwikly books you just 10 extra appointments per month, that&apos;s:
            </p>

            <div className="space-y-6">
              <div className="bg-card rounded-xl p-6 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-muted">Your investment</span>
                <div className="text-right">
                  <span className="text-sm text-muted">10 x R750 = </span>
                  <span className="font-heading text-2xl font-bold text-foreground">
                    R7,500/month
                  </span>
                </div>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-muted">
                  Average job value for a plumber
                </span>
                <span className="font-heading text-2xl font-bold text-foreground sm:text-right">
                  R5,000
                </span>
              </div>

              <div className="bg-card rounded-xl p-6 border border-border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-muted">New revenue</span>
                <div className="text-right">
                  <span className="text-sm text-muted">10 x R5,000 = </span>
                  <span className="font-heading text-2xl font-bold text-foreground">
                    R50,000/month
                  </span>
                </div>
              </div>

              <div className="bg-primary rounded-xl p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <span className="text-gray-300 font-semibold">Return on Investment</span>
                <span className="font-heading text-4xl font-bold text-cta">
                  567%
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <FAQ />

      {/* Final CTA */}
      <section className="py-20 bg-background">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-primary">
            Ready to get started?
          </h2>
          <div className="mt-8">
            <CTAButton size="lg">Start Your Free 7-Day Trial</CTAButton>
          </div>
        </div>
      </section>
    </main>
  );
}
