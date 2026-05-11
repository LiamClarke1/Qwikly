import CTAButton from "@/components/CTAButton";
import PipelineHero from "@/components/pipeline/PipelineHero";
import PipelineFAQ, { type FAQItem } from "@/components/pipeline/PipelineFAQ";

const whatYouGet: { title: string; body: string }[] = [
  {
    title: "Matched to your ICP",
    body: "Tell us who your ideal client is. We hand-pick prospects that fit your target profile, filtered for size, industry, role, and location.",
  },
  {
    title: "Verified contact info",
    body: "Every prospect we deliver comes with a verified work email. No bouncing addresses, no out of date contacts, no role mailboxes.",
  },
  {
    title: "Suggested outreach copy",
    body: "Each prospect ships with a starting message you can adapt and send yourself. You stay in control of tone, follow-up, and timing.",
  },
];

const dailyVolume: { tier: string; perDay: string; note: string }[] = [
  { tier: "Pro", perDay: "5", note: "prospects per business day" },
  { tier: "Founders", perDay: "10", note: "prospects per business day" },
  { tier: "Business", perDay: "15", note: "prospects per business day" },
  { tier: "Enterprise", perDay: "Custom", note: "volume agreed with you" },
];

const howItWorks: { step: string; title: string; body: string }[] = [
  {
    step: "01",
    title: "You define your ICP",
    body: "On setup we agree on the exact profile you want, industry, role, size, region. You can adjust it from your dashboard at any time.",
  },
  {
    step: "02",
    title: "We hand-pick prospects daily",
    body: "Every business day we research and verify a fresh batch that matches your ICP. No mass scrapes, no recycled lists.",
  },
  {
    step: "03",
    title: "Delivered to your dashboard",
    body: "Your prospect list appears in your Qwikly dashboard each morning, with contact details and a suggested outreach message.",
  },
  {
    step: "04",
    title: "You decide who to contact",
    body: "Open the list, pick the ones you want to pursue, adapt the suggested copy, and send from your own inbox.",
  },
];

const faqs: FAQItem[] = [
  {
    question: "Does Qwikly send the emails for me?",
    answer:
      "No. Outbound delivers the qualified prospect list. You decide who to contact, adapt the suggested copy if you want to, and send from your own inbox. You stay in control of every message.",
  },
  {
    question: "Does Qwikly book the meeting on my calendar?",
    answer:
      "No. We do not book meetings, send calendar invites, or track who responded. Outbound is a daily prospect feed. Booking the meeting is your job once a prospect replies.",
  },
  {
    question: "How are prospects delivered?",
    answer:
      "Through your Qwikly dashboard each business day. You log in and see the day's batch, with contact details and suggested copy. We do not push leads via SMS or WhatsApp.",
  },
  {
    question: "How many prospects do I get?",
    answer:
      "Pro is 5 per business day, Founders is 10 per business day, Business is 15 per business day, and Enterprise is a custom volume agreed with you.",
  },
  {
    question: "Is there a setup fee?",
    answer:
      "No. Outbound is bundled into every Qwikly plan from Pro upward at no extra setup cost. There are no add-on fees.",
  },
  {
    question: "Is cold outreach legal in SA under POPIA?",
    answer:
      "Yes, with the right framing. POPIA allows business-to-business outreach under legitimate interest, provided every message has a clear opt-out and you respect direct marketing requests. We brief you on the compliance side at setup.",
  },
];

export default function PipelinePage() {
  return (
    <div className="bg-paper">

      {/* HERO + FAUX FEED */}
      <PipelineHero />

      {/* WHAT YOU GET — 3 text blocks with hairline dividers */}
      <section id="what-you-get" className="py-24 md:py-28 grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ember mb-6">What you get</p>
            <h2 className="display-lg text-ink">
              A daily hand-picked list,
              <br />
              <em className="italic font-light">ready to act on.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-0">
            {whatYouGet.map((item, i) => (
              <div
                key={item.title}
                className={`md:px-10 ${i > 0 ? "md:border-l md:border-ink/10" : ""} ${i === 0 ? "md:pl-0 md:pr-10" : ""} ${i === whatYouGet.length - 1 ? "md:pr-0" : ""}`}
              >
                <h3 className="font-display text-2xl text-ink leading-snug mb-4">
                  {item.title}
                </h3>
                <p className="text-ink-700 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DAILY VOLUME — tight stat strip */}
      <section className="py-24 md:py-28 bg-paper-deep grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-12 md:mb-16 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">Daily volume by plan</p>
            <h2 className="display-lg text-ink">
              How many prospects,
              <br />
              <em className="italic font-light">per business day.</em>
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-y-10 gap-x-6">
            {dailyVolume.map(({ tier, perDay, note }) => (
              <div key={tier} className="flex flex-col">
                <span
                  className="font-display font-medium text-ember leading-none num"
                  style={{ fontSize: "clamp(2.75rem, 6vw, 4.5rem)" }}
                >
                  {perDay}
                </span>
                <span className="mt-4 eyebrow text-ink-700">{tier}</span>
                <span className="mt-1 text-xs text-ink-500 leading-snug max-w-[18ch]">{note}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS — vertical numbered list */}
      <section id="how-it-works" className="py-24 md:py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">How it works</p>
            <h2 className="display-lg text-ink">
              From your ICP
              <br />
              <em className="italic font-light">to your dashboard.</em>
            </h2>
          </div>

          <ol className="border-t border-ink/10">
            {howItWorks.map((step) => (
              <li
                key={step.step}
                className="grid grid-cols-12 gap-6 md:gap-10 py-8 md:py-10 border-b border-ink/10 items-start"
              >
                <div className="col-span-3 md:col-span-2">
                  <span
                    className="font-display font-medium text-ember leading-none num block"
                    style={{ fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)" }}
                  >
                    {step.step}
                  </span>
                </div>
                <div className="col-span-9 md:col-span-10 max-w-2xl">
                  <h3 className="font-display text-2xl text-ink leading-snug mb-2">{step.title}</h3>
                  <p className="text-ink-700 leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-24 md:py-28 bg-paper-deep grain border-t border-ink/[0.06]">
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
              <PipelineFAQ items={faqs} />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-28 md:py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[480px] top-0 left-1/2 -translate-x-1/2" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[22ch] mx-auto">
            Start your daily{" "}
            <em className="italic font-light text-ember">prospect feed.</em>
          </h2>
          <div className="mt-12 flex justify-center">
            <CTAButton href="/signup" variant="solid" size="lg">
              Get started
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
