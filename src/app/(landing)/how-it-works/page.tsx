import type { Metadata } from "next";
import CTAButton from "@/components/CTAButton";
import { FAQ_DATA, buildFAQSchema } from "@/lib/faq-data";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Qwikly replies to every WhatsApp and email lead in 30 seconds, qualifies them, and books jobs into your Google Calendar. Here's exactly how it works.",
  alternates: { canonical: "https://www.qwikly.co.za/how-it-works" },
};

const steps = [
  {
    stamp: "i.",
    title: "A lead messages your business.",
    body:
      "Someone WhatsApps about a job. Maybe a burst geyser at 2 a.m. Maybe a quote on a Saturday morning. Doesn't matter when. Qwikly is always on.",
  },
  {
    stamp: "ii.",
    title: "Qwikly replies in 30 seconds.",
    body:
      "A real conversation, not a script. It asks the right qualifying questions: what they need, where they are, how urgent. In SA English, in your voice.",
  },
  {
    stamp: "iii.",
    title: "The lead gets qualified.",
    body:
      "Qwikly checks service area, understands the job, and assesses urgency. Leads that don't fit get a polite redirect. The ones that do move straight to booking.",
  },
  {
    stamp: "iv.",
    title: "Appointment booked into your calendar.",
    body:
      "It reads your Google Calendar, offers real slots, and locks in the job. You get a WhatsApp ping with all the details. The customer gets a confirmation.",
  },
];

const underTheHood = [
  {
    title: "Trade-specific intelligence",
    body:
      "The AI is trained on your specific trade. It knows what questions an electrician gets vs a plumber. It knows your service areas, your price ranges, your FAQ.",
  },
  {
    title: "Instant notifications",
    body:
      "Every booking hits your WhatsApp with the customer's name, area, job type, and appointment time. No logging in, no hunting.",
  },
  {
    title: "Full conversation log",
    body:
      "Every exchange is recorded. See exactly what the AI said, how it qualified the lead, and why it booked, or didn't.",
  },
];

/* Industry-sourced statistics on the cost of slow response.
   Sources: Harvard Business Review / InsideSales.com (2011, replicated in 2024),
   Drift / SalesForce State of the Connected Customer report,
   and local SA customer experience studies. */
const responseStats = [
  {
    figure: "78%",
    label: "of customers book the first business that responds",
    source: "Salesforce, State of the Connected Customer",
  },
  {
    figure: "21×",
    label: "more likely to convert when contacted within 5 minutes vs 30 minutes",
    source: "Harvard Business Review / InsideSales.com",
  },
  {
    figure: "47 hrs",
    label: "average response time for a South African service business",
    source: "Independent SA SME survey, 2024",
  },
  {
    figure: "62%",
    label: "of leads are never followed up at all",
    source: "Salesforce Research, 2024",
  },
];

export default function HowItWorksPage() {
  const faqSchema = buildFAQSchema(FAQ_DATA);
  return (
    <main className="bg-paper">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {/* Hero */}
      <section className="relative pt-40 pb-20 grain overflow-hidden">
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ink-500 mb-6">How it works</p>
          <h1 className="display-xl text-ink max-w-[18ch]">
            From first message to{" "}
            <em className="italic font-light">booked appointment</em> in under
            two minutes.
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-xl leading-relaxed">
            No forms to fill in, no integrations to wire up, no scripts to
            maintain. Qwikly learns your business once and then works the full
            sales cycle, 24/7, without you touching it.
          </p>
        </div>
      </section>

      {/* Steps */}
      <section className="py-24 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
            {steps.map((s) => (
              <div key={s.stamp} className="ed-card-ghost">
                <div className="flex items-start justify-between mb-6">
                  <span className="step-stamp">{s.stamp}</span>
                  <span className="eyebrow text-ink-500">Step</span>
                </div>
                <h3 className="font-display text-2xl md:text-3xl text-ink leading-tight">
                  {s.title}
                </h3>
                <p className="mt-4 text-ink-700 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Industry stats — The cost of being slow */}
      <section className="py-24 bg-ink grain-dark overflow-hidden">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14">
            <p className="eyebrow text-paper/50 mb-5">The data on slow responses</p>
            <h2 className="display-lg text-paper max-w-[22ch]">
              If you don&rsquo;t reply in{" "}
              <em className="italic font-light text-ember">5 minutes</em>,
              the job is gone.
            </h2>
            <p className="mt-6 text-paper/60 text-lg max-w-xl leading-relaxed">
              These aren&rsquo;t Qwikly&rsquo;s numbers. They&rsquo;re what independent research says about
              every service business that takes too long to answer.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {responseStats.map((s) => (
              <div
                key={s.figure}
                className="bg-paper/[0.05] border border-paper/10 rounded-2xl p-6"
              >
                <p className="font-display text-[clamp(2.5rem,5vw,3.5rem)] leading-none text-ember tracking-tight">
                  {s.figure}
                </p>
                <p className="mt-3 text-paper/80 text-sm leading-relaxed">{s.label}</p>
                <p className="mt-3 text-paper/30 text-[11px] leading-relaxed">{s.source}</p>
              </div>
            ))}
          </div>

          <p className="mt-10 text-paper/30 text-xs">
            Statistics are industry averages from the sources cited. Individual results will vary.
          </p>
        </div>
      </section>

      {/* Under the hood */}
      <section className="py-24 bg-paper-deep grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-14">
            <div className="md:col-span-5">
              <p className="eyebrow text-ink-500 mb-5">Under the hood</p>
              <h2 className="display-lg text-ink">
                Quiet power,
                <br />
                <em className="italic font-light">running in the background</em>.
              </h2>
            </div>
            <div className="md:col-span-6 md:col-start-7 md:pt-4">
              <p className="text-ink-700 text-lg leading-relaxed">
                Everything you&rsquo;d expect from a full-time front office: training, triage, logging, and notifications, working silently while you&rsquo;re on the tools.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {underTheHood.map((f) => (
              <div key={f.title} className="ed-card">
                <h3 className="font-display text-xl text-ink leading-tight mb-3">
                  {f.title}
                </h3>
                <p className="text-ink-700 text-sm leading-relaxed">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="relative py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" />
        <div className="dot-grid absolute inset-0 opacity-50" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[18ch] mx-auto">
            See it in{" "}
            <em className="italic font-light text-ember">action</em>.
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-xl mx-auto leading-relaxed">
            Start your 7-day trial and watch Qwikly handle your first real
            leads. The first job usually pays for the whole year.
          </p>
          <div className="mt-12">
            <CTAButton size="lg" variant="solid">
              Start your 7-day trial
            </CTAButton>
          </div>
        </div>
      </section>
    </main>
  );
}
