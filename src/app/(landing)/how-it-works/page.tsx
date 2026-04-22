import CTAButton from "@/components/CTAButton";

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

export default function HowItWorksPage() {
  return (
    <main className="bg-paper">
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
