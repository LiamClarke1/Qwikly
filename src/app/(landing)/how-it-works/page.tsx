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
      "A customer messages via WhatsApp, email, or your website chat. Maybe a burst geyser at 2 a.m. Maybe a quote request on a Saturday morning. Doesn't matter when or how they reach out. Qwikly is always on.",
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
      "It reads your Google Calendar, offers real slots, and locks in the job. You get a WhatsApp or email notification with all the details. The customer gets a confirmation on the channel they used.",
  },
];

const underTheHood = [
  {
    title: "Trade-specific intelligence",
    body:
      "Your digital assistant is trained on your specific trade. It knows what questions an electrician gets vs a plumber. It knows your service areas, your price ranges, your FAQ.",
  },
  {
    title: "Instant notifications",
    body:
      "Every booking hits your WhatsApp or email with the customer's name, area, job type, and appointment time. No logging in, no hunting.",
  },
  {
    title: "Full conversation log",
    body:
      "Every exchange is recorded. See exactly what your assistant said, how it qualified the lead, and why it booked, or didn't.",
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
    <div className="bg-paper">
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
          <div className="mt-6 flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/></svg>
              <span className="text-xs font-semibold text-[#25D366]">WhatsApp</span>
            </div>
            <svg viewBox="0 0 16 16" className="w-3 h-3 text-ink-300" fill="none"><path d="M6 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ember/10 border border-ember/20">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 text-ember" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>
              <span className="text-xs font-semibold text-ember">Email</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
              <span className="text-xs font-semibold text-blue-500">Website Chat</span>
            </div>
            <span className="text-xs text-ink-400 pl-1">All three channels, one system.</span>
          </div>
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
                <h2 className="font-display text-2xl md:text-3xl text-ink leading-tight">
                  {s.title}
                </h2>
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
    </div>
  );
}
