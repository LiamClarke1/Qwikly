import type { Metadata } from "next";
import CTAButton from "@/components/CTAButton";
import DigitalAssistantFAQ, { type FAQItem } from "@/components/digital-assistant/DigitalAssistantFAQ";

export const metadata: Metadata = {
  title: "Qwikly Digital Assistant, inbound lead capture for SA service businesses",
  description:
    "A chat widget on your website that replies to visitors in under 60 seconds, qualifies them, and emails you the contact info and transcript. Built for SA service businesses.",
};

const problems: { title: string; body: string }[] = [
  {
    title: "After-hours leads vanish",
    body: "Visitor lands on your site at 9pm with a burst geyser. Your phone is on silent. Lead lost.",
  },
  {
    title: "On-site, off-comms",
    body: "Owner is on a job. The enquiry sits unread for hours. Lead has called the next plumber by then.",
  },
  {
    title: "Chats, not contact details",
    body: "Generic chat tools collect chit-chat, not qualified leads with real contact info. You still chase manually.",
  },
];

const steps: { title: string; body: string }[] = [
  {
    title: "Replies on your website in under 60 seconds",
    body: "A chat widget sits on your site and greets every visitor instantly, day or night.",
  },
  {
    title: "Qualifies the lead",
    body: "Asks the qualifying questions you set during onboarding, suburb, urgency, type of job, so you only hear about leads worth your time.",
  },
  {
    title: "Captures their contact info",
    body: "Gets the visitor's name, email, and phone number before the conversation ends.",
  },
  {
    title: "Emails you the lead and the transcript",
    body: "When a new qualified lead comes in, you get an email with their contact info and the full chat transcript. You take it from there.",
  },
];

const faqs: FAQItem[] = [
  {
    question: "Will Qwikly answer like a human?",
    answer:
      "Yes. We set up Qwikly in your tone with your qualifying questions, your service areas, and your pricing rules. Visitors get a calm, branded conversation that feels like your best receptionist on her best day, not a generic widget.",
  },
  {
    question: "How do I find out about a new lead?",
    answer:
      "Email. When a new qualified lead finishes the chat, we email you with their name, email, phone number, and the full transcript of what they said. You reply to them directly from your inbox.",
  },
  {
    question: "Does it book leads into my calendar?",
    answer:
      "No. The digital assistant captures, qualifies, and emails you the lead with their contact info and transcript. You decide when and how to follow up. We do not book calls, send calendar invites, or take any action beyond the initial chat.",
  },
  {
    question: "Do you also notify me on WhatsApp or SMS?",
    answer:
      "Not for the digital assistant. Owner notifications go by email only. Email gives you the contact info and the full transcript in one place, so you can reply to the lead without switching apps.",
  },
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. No lock-in contracts. You also get a 30-day risk reversal, if Qwikly does not produce real, qualified leads in your first 30 days, we refund the month, no questions.",
  },
];

function ChatWidgetMockup() {
  return (
    <div className="relative w-full max-w-md mx-auto">
      <div
        className="relative rounded-2xl bg-white border border-ink/[0.06] overflow-hidden"
        style={{ boxShadow: "0 30px 60px -20px rgba(28, 24, 22, 0.25), 0 18px 36px -18px rgba(232, 90, 44, 0.18)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ink/[0.06]">
          <div className="flex items-center gap-2.5">
            <span className="relative inline-flex w-2.5 h-2.5">
              <span className="absolute inset-0 rounded-full bg-ember animate-ping opacity-60" aria-hidden="true" />
              <span className="relative inline-block w-2.5 h-2.5 rounded-full bg-ember" />
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ember/10 text-ember text-[11px] font-medium tracking-wide">
              Online
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-ink/15" aria-hidden="true" />
            <span className="w-1.5 h-1.5 rounded-full bg-ink/15" aria-hidden="true" />
            <span className="w-1.5 h-1.5 rounded-full bg-ink/15" aria-hidden="true" />
          </div>
        </div>

        {/* Conversation */}
        <div className="px-5 py-6 space-y-4 bg-paper/40">
          {/* Assistant */}
          <div className="flex justify-start">
            <div className="max-w-[78%] rounded-2xl rounded-tl-md bg-paper-deep px-4 py-3 text-sm text-ink leading-relaxed">
              Hi, thanks for stopping by. What can we help you sort out today?
            </div>
          </div>

          {/* Visitor */}
          <div className="flex justify-end">
            <div className="max-w-[78%] rounded-2xl rounded-tr-md bg-ember/10 px-4 py-3 text-sm text-ink leading-relaxed">
              Burst geyser in Rondebosch, need someone tonight.
            </div>
          </div>

          {/* Assistant */}
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-paper-deep px-4 py-3 text-sm text-ink leading-relaxed">
              Got it — urgent geyser callout, Rondebosch. Is the water shut off or still running?
            </div>
          </div>

          {/* Assistant closing CTA (bold) */}
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl rounded-tl-md bg-paper-deep px-4 py-3 text-sm text-ink leading-relaxed">
              <strong className="font-semibold">What&apos;s your email so the team can confirm availability and reach you?</strong>
            </div>
          </div>
        </div>

        {/* Input row */}
        <div className="px-5 py-4 border-t border-ink/[0.06] bg-white">
          <div className="flex items-center gap-3 rounded-xl bg-paper/60 border border-ink/[0.06] px-4 py-3">
            <span className="text-sm text-ink-500 flex-1">Type your reply…</span>
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-ember text-paper">
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.25" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </span>
          </div>
        </div>
      </div>

      {/* Soft floating tag */}
      <div className="absolute -bottom-4 -left-4 hidden md:flex items-center gap-2 px-3 py-2 rounded-xl bg-ink text-paper text-[11px] font-medium tracking-wide shadow-lg">
        <span className="w-1.5 h-1.5 rounded-full bg-ember" aria-hidden="true" />
        Reply in under 60 seconds
      </div>
    </div>
  );
}

export default function DigitalAssistantPage() {
  return (
    <div className="bg-paper">

      {/* HERO, split */}
      <section className="relative pt-36 md:pt-44 pb-20 grain overflow-hidden">
        <div className="ember-blob w-[640px] h-[420px] -top-24 -right-32 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-10 items-center">
            {/* Left, copy */}
            <div className="md:col-span-6">
              <h1 className="font-display text-ink leading-[1.02] tracking-tight" style={{ fontSize: "clamp(2.75rem, 6vw, 4.5rem)" }}>
                Replies in under{" "}
                <em className="italic font-light text-ember">sixty seconds.</em>
              </h1>
              <p className="mt-8 text-lg text-ink-700 max-w-xl leading-relaxed">
                A digital assistant lives on your website, greets every visitor, qualifies the job, and emails you the lead with the full transcript. Built for South African service businesses.
              </p>

              <div className="mt-10 flex flex-col sm:flex-row sm:items-center gap-4">
                <CTAButton href="/contact" variant="solid" size="lg">
                  Get started
                </CTAButton>
                <a
                  href="/pricing"
                  className="inline-flex items-center gap-2 text-ink font-medium text-base group"
                >
                  <span className="border-b border-ink/30 group-hover:border-ember group-hover:text-ember transition-colors">
                    See pricing
                  </span>
                  <svg viewBox="0 0 24 24" className="w-4 h-4 text-ink-700 group-hover:text-ember transition-colors" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <line x1="5" y1="12" x2="19" y2="12" />
                    <polyline points="12 5 19 12 12 19" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Right, chat widget mockup */}
            <div className="md:col-span-6">
              <ChatWidgetMockup />
            </div>
          </div>
        </div>
      </section>

      {/* WHAT IT DOES, numbered text rows */}
      <section id="how" className="py-28 grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <h2 className="display-lg text-ink">
              What it does,
              <br />
              <em className="italic font-light">in four steps.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-xl">
              A chat widget on your website that replies in under 60 seconds, qualifies the visitor with your questions, captures their contact info, and emails you the lead with the full transcript.
            </p>
          </div>

          <div>
            {steps.map((step, i) => (
              <div
                key={step.title}
                className="grid grid-cols-12 gap-6 md:gap-10 py-10 md:py-12 border-t border-ink/10"
              >
                <div className="col-span-12 md:col-span-3">
                  <span
                    className="font-display font-medium text-ember leading-none"
                    style={{ fontSize: "clamp(2.5rem, 5vw, 4rem)" }}
                  >
                    0{i + 1}
                  </span>
                </div>
                <div className="col-span-12 md:col-span-9">
                  <h3 className="font-display text-ink leading-snug" style={{ fontSize: "clamp(1.5rem, 2.4vw, 2rem)" }}>
                    {step.title}
                  </h3>
                  <p className="mt-4 text-ink-700 leading-relaxed max-w-2xl">
                    {step.body}
                  </p>
                </div>
              </div>
            ))}
            <div className="border-t border-ink/10" aria-hidden="true" />
          </div>
        </div>
      </section>

      {/* PROBLEM, dark text-only */}
      <section className="py-28 bg-ink text-paper grain-dark relative overflow-hidden">
        <div className="ember-blob w-[700px] h-[400px] top-0 left-1/2 -translate-x-1/2 opacity-40" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <h2 className="display-lg text-paper">
              Built for South African
              <br />
              <em className="italic font-light text-ember">service businesses.</em>
            </h2>
            <p className="mt-6 text-lg text-paper/70 leading-relaxed max-w-xl">
              Three patterns we see every week, and exactly what the digital assistant fixes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
            {problems.map((p) => (
              <div key={p.title}>
                <h3 className="font-display text-paper leading-snug" style={{ fontSize: "clamp(1.4rem, 2vw, 1.75rem)" }}>
                  {p.title}
                </h3>
                <p className="mt-4 text-paper/70 leading-relaxed">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-28 bg-paper grain border-t border-ink/[0.06]">
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
              <DigitalAssistantFAQ items={faqs} />
            </div>
          </div>
        </div>
      </section>

      {/* BOTTOM CTA */}
      <section className="py-24 bg-paper-deep grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <p className="font-display text-ink leading-snug max-w-2xl" style={{ fontSize: "clamp(1.6rem, 2.6vw, 2.25rem)" }}>
              Live on your website in 24 hours,{" "}
              <em className="italic font-light text-ember">no lock-in.</em>
            </p>
            <CTAButton href="/contact" variant="solid" size="lg">
              Get started
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
