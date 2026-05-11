import { Check, Target, Mail, Inbox, Users, FileText, ListChecks, type LucideIcon } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import PipelineHero from "@/components/pipeline/PipelineHero";
import PipelineFAQ, { type FAQItem } from "@/components/pipeline/PipelineFAQ";

const whatYouGet: { Icon: LucideIcon; title: string; body: string; bullets: string[] }[] = [
  {
    Icon: Target,
    title: "Matched to your ICP",
    body: "Tell us who your ideal client is. We hand-pick prospects that fit your target profile, filtered for size, industry, role, and location.",
    bullets: [
      "Defined to your ICP",
      "Filtered by industry and role",
      "Filtered by company size",
      "Filtered by location",
    ],
  },
  {
    Icon: Mail,
    title: "Verified contact info",
    body: "Every prospect we deliver comes with a verified work email. No bouncing addresses, no out of date contacts, no role mailboxes.",
    bullets: [
      "Verified work email",
      "Name and role",
      "Company and website",
      "Linked source where possible",
    ],
  },
  {
    Icon: FileText,
    title: "Suggested outreach copy",
    body: "Each prospect ships with a starting message you can adapt and send yourself. You stay in control of tone, follow-up, and timing.",
    bullets: [
      "Personalised starter message",
      "Adapt before you send",
      "Reply-driven framing",
      "You send from your own inbox",
    ],
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

      {/* HERO */}
      <PipelineHero />

      {/* WHAT OUTBOUND IS */}
      <section className="py-28 bg-paper-deep grain overflow-hidden border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">What Outbound is</p>
            <h2 className="display-lg text-ink">
              Outbound finds your next client.
              <br />
              <em className="italic font-light">You decide who to reach out to.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-xl">
              We don&apos;t book anything. We deliver a qualified, verified prospect list to your dashboard every business day, with suggested outreach copy you can adapt. You stay in control of every message.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT YOU GET */}
      <section id="what-you-get" className="py-28 grain overflow-hidden">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ember mb-6">What you get</p>
            <h2 className="display-lg text-ink">
              A daily hand-picked list,
              <br />
              <em className="italic font-light">ready to act on.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {whatYouGet.map(({ Icon, title, body, bullets }) => (
              <div key={title} className="ed-card flex flex-col">
                <div className="w-11 h-11 rounded-xl bg-ink/[0.05] flex items-center justify-center mb-6">
                  <Icon className="w-5 h-5 text-ink" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="font-display text-2xl text-ink leading-snug mb-3">{title}</h3>
                <p className="text-ink-700 text-sm leading-relaxed mb-6">{body}</p>
                <ul className="space-y-2.5 mt-auto">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-ink-700">
                      <Check className="w-4 h-4 mt-0.5 text-ember flex-shrink-0" strokeWidth={2.5} aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* DAILY VOLUME BY TIER */}
      <section className="py-28 bg-ink text-paper grain-dark relative overflow-hidden">
        <div className="ember-blob w-[700px] h-[400px] top-0 left-1/2 -translate-x-1/2 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ember mb-6">Daily volume</p>
            <h2 className="display-lg text-paper">
              How many prospects,
              <br />
              <em className="italic font-light text-ember">per business day.</em>
            </h2>
            <p className="mt-6 text-lg text-paper/70 leading-relaxed max-w-xl">
              Outbound is included in every plan from Pro upward. Your daily prospect count scales with your tier.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {dailyVolume.map(({ tier, perDay, note }) => (
              <div key={tier} className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-8">
                <p className="eyebrow text-paper/60 mb-4">{tier}</p>
                <p
                  className="font-display font-medium text-ember leading-none mb-4 num"
                  style={{ fontSize: "clamp(2.25rem, 4vw, 3rem)" }}
                >
                  {perDay}
                </p>
                <p className="text-paper/80 text-sm leading-relaxed">{note}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how-it-works" className="py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">How it works</p>
            <h2 className="display-lg text-ink">
              From your ICP
              <br />
              <em className="italic font-light">to your dashboard.</em>
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step) => (
              <div key={step.step} className="relative ed-card-ghost">
                <span className="absolute -top-3 left-6 inline-flex items-center justify-center w-10 h-8 rounded-full bg-ink text-paper font-display text-xs num px-2">
                  {step.step}
                </span>
                <h3 className="font-display text-xl text-ink leading-snug mt-3 mb-3">{step.title}</h3>
                <p className="text-ink-700 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT IT IS NOT */}
      <section className="py-28 bg-paper-deep grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10 items-start">
            <div className="md:col-span-5">
              <p className="eyebrow text-ink-500 mb-6">Plain talk</p>
              <h2 className="display-lg text-ink">
                What Outbound
                <br />
                <em className="italic font-light">isn&apos;t.</em>
              </h2>
              <p className="mt-6 text-base text-ink-700 leading-relaxed max-w-md">
                We&apos;d rather under-promise. Here&apos;s exactly what Outbound does not do.
              </p>
            </div>

            <div className="md:col-span-7 space-y-4">
              {[
                {
                  Icon: Users,
                  title: "We do not book meetings on your calendar",
                  body: "No calendar invites, no scheduling on your behalf. When a prospect replies, you book the meeting.",
                },
                {
                  Icon: ListChecks,
                  title: "We do not track who responded or showed up",
                  body: "Outbound is a daily prospect feed, not a CRM. Tracking replies, attendance and outcomes is on your side.",
                },
                {
                  Icon: Inbox,
                  title: "We do not deliver via SMS or WhatsApp",
                  body: "Prospects arrive in your Qwikly dashboard each business day. That&rsquo;s the only delivery channel for Outbound.",
                },
              ].map(({ Icon, title, body }) => (
                <div key={title} className="ed-card flex items-start gap-5 p-6">
                  <div className="w-10 h-10 rounded-xl bg-ink/[0.05] flex items-center justify-center flex-shrink-0">
                    <Icon className="w-5 h-5 text-ink" strokeWidth={1.75} aria-hidden />
                  </div>
                  <div>
                    <h3 className="font-display text-lg text-ink leading-snug mb-1.5">{title}</h3>
                    <p className="text-ink-700 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: body }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
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
              <PipelineFAQ items={faqs} />
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" aria-hidden="true" />
        <div className="dot-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[24ch] mx-auto">
            See pricing for{" "}
            <em className="italic font-light text-ember">Outbound.</em>
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-2xl mx-auto leading-relaxed">
            Outbound is included in every plan from Pro upward. No setup fee, no add-ons.
          </p>
          <div className="mt-12 flex justify-center">
            <CTAButton href="/pricing" variant="solid" size="lg">
              See pricing
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
