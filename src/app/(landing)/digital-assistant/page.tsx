import type { Metadata } from "next";
import {
  Check,
  MessageSquare,
  Filter,
  Mail,
  LayoutDashboard,
  Zap,
  ShieldCheck,
  Globe2,
  Rocket,
  PhoneOff,
  Hourglass,
  MessagesSquare,
  type LucideIcon,
} from "lucide-react";
import CTAButton from "@/components/CTAButton";
import DigitalAssistantHero from "@/components/digital-assistant/DigitalAssistantHero";
import DigitalAssistantFAQ, { type FAQItem } from "@/components/digital-assistant/DigitalAssistantFAQ";

export const metadata: Metadata = {
  title: "Qwikly Digital Assistant, inbound lead capture for SA service businesses",
  description:
    "A chat widget on your website that replies to visitors in under 60 seconds, qualifies them, and emails you the contact info and transcript. Built for SA service businesses.",
};

const problems: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: PhoneOff,
    title: "After-hours leads vanish",
    body: "Visitor lands on your site at 9pm with a burst geyser. Your phone is on silent. Lead lost.",
  },
  {
    Icon: Hourglass,
    title: "On-site, off-comms",
    body: "Owner is on a job. The enquiry sits unread for hours. Lead has called the next plumber by then.",
  },
  {
    Icon: MessagesSquare,
    title: "Chats, not contact details",
    body: "Generic chat tools collect chit-chat, not qualified leads with real contact info. You still chase manually.",
  },
];

const steps: { Icon: LucideIcon; title: string; body: string; bullets: string[] }[] = [
  {
    Icon: MessageSquare,
    title: "Replies on your website in under 60 seconds",
    body: "A chat widget sits on your site and greets every visitor instantly, day or night.",
    bullets: [
      "24/7 availability",
      "Lives on your website",
      "Works on mobile and desktop",
      "No app to install",
    ],
  },
  {
    Icon: Filter,
    title: "Qualifies the lead",
    body: "Asks the qualifying questions you set during onboarding, suburb, urgency, type of job, so you only hear about leads worth your time.",
    bullets: [
      "Your qualifying questions",
      "Set during onboarding",
      "Captures the problem in their words",
      "Filters out time-wasters",
    ],
  },
  {
    Icon: Mail,
    title: "Captures their contact info",
    body: "Gets the visitor's name, email, and phone number before the conversation ends.",
    bullets: [
      "Name",
      "Email",
      "Phone number",
      "Logged in your dashboard",
    ],
  },
  {
    Icon: LayoutDashboard,
    title: "Emails you the lead and the transcript",
    body: "When a new qualified lead comes in, you get an email with their contact info and the full chat transcript. You take it from there.",
    bullets: [
      "Email to the business owner",
      "Contact info included",
      "Full chat transcript attached",
      "Lead history in your dashboard",
    ],
  },
];

const youGet: { Icon: LucideIcon; stat: string; label: string; estimate: boolean }[] = [
  {
    Icon: Zap,
    stat: "Under 60s",
    label: "first reply to your website visitor",
    estimate: false,
  },
  {
    Icon: Mail,
    stat: "Email",
    label: "lead alert with contact info and transcript",
    estimate: false,
  },
  {
    Icon: ShieldCheck,
    stat: "POPIA",
    label: "compliant, hosted in South Africa, ZAR billing",
    estimate: false,
  },
  {
    Icon: Rocket,
    stat: "24 hrs",
    label: "live on your website",
    estimate: false,
  },
];

const tiers: {
  id: "starter" | "pro" | "concierge";
  name: string;
  price: string;
  tagline: string;
  highlight: boolean;
}[] = [
  {
    id: "starter",
    name: "Starter",
    price: "R699",
    tagline: "For solo operators getting their first inbound capture live.",
    highlight: false,
  },
  {
    id: "pro",
    name: "Pro",
    price: "R1,799",
    tagline: "For growing teams that want every website enquiry qualified and emailed in.",
    highlight: true,
  },
  {
    id: "founders",
    name: "Founders",
    price: "R2,999",
    tagline: "Pro features, double the daily Outbound prospects (10 per business day).",
    highlight: false,
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

export default function DigitalAssistantPage() {
  return (
    <div className="bg-paper">

      {/* HERO */}
      <DigitalAssistantHero />

      {/* PROBLEM */}
      <section className="py-28 bg-paper-deep grain overflow-hidden border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">The problem</p>
            <h2 className="display-lg text-ink">
              Inbound is leaking,
              <br />
              <em className="italic font-light">and you are paying for it.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {problems.map(({ Icon, title, body }) => (
              <div key={title} className="ed-card-ghost">
                <div className="w-10 h-10 rounded-xl bg-ember/12 flex items-center justify-center mb-6">
                  <Icon className="w-5 h-5 text-ember" strokeWidth={1.75} aria-hidden />
                </div>
                <h3 className="font-display text-xl text-ink leading-snug mb-3">{title}</h3>
                <p className="text-ink-700 text-sm leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT QWIKLY DOES */}
      <section id="how" className="py-28 grain overflow-hidden">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ember mb-6">What Qwikly does</p>
            <h2 className="display-lg text-ink">
              A chat widget on your site,
              <br />
              <em className="italic font-light">that emails you the lead.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-xl">
              Qwikly is a chat widget on your website that replies in under 60 seconds, qualifies the visitor with your questions, captures their contact info, and emails you the lead with the full transcript.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {steps.map(({ Icon, title, body, bullets }, i) => (
              <div key={title} className="ed-card flex flex-col relative">
                <span className="absolute -top-3 left-6 inline-flex items-center justify-center w-8 h-8 rounded-full bg-ink text-paper font-display text-sm">
                  {i + 1}
                </span>
                <div className="w-11 h-11 rounded-xl bg-ink/[0.05] flex items-center justify-center mb-6 mt-3">
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

      {/* WHAT YOU GET */}
      <section className="py-28 bg-ink text-paper grain-dark relative overflow-hidden">
        <div className="ember-blob w-[700px] h-[400px] top-0 left-1/2 -translate-x-1/2 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ember mb-6">What you get</p>
            <h2 className="display-lg text-paper">
              The basics,
              <br />
              <em className="italic font-light text-ember">in plain ZAR terms.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {youGet.map(({ Icon, stat, label, estimate }) => (
              <div key={label} className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-8">
                <div className="w-11 h-11 rounded-xl bg-ember/15 flex items-center justify-center mb-6">
                  <Icon className="w-5 h-5 text-ember" strokeWidth={1.75} aria-hidden />
                </div>
                <p
                  className="font-display font-medium text-ember leading-none mb-4"
                  style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}
                >
                  {stat}
                </p>
                <p className="text-paper/80 text-sm leading-relaxed mb-4">{label}</p>
                {estimate && (
                  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-paper/[0.06] border border-paper/15">
                    <span className="w-1.5 h-1.5 rounded-full bg-ember" aria-hidden="true" />
                    <span className="eyebrow text-[9px] tracking-widest text-paper/70">industry estimate</span>
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-3 text-paper/60 text-sm">
            <Globe2 className="w-4 h-4 text-ember" strokeWidth={1.75} aria-hidden />
            <span>POPIA compliant, hosted in South Africa, billed in ZAR.</span>
          </div>
        </div>
      </section>

      {/* PROOF */}
      <section className="py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">Proof</p>
            <h2 className="display-lg text-ink">
              Real case studies,
              <br />
              <em className="italic font-light">coming soon.</em>
            </h2>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-ink/[0.02] p-10 md:p-14 text-center max-w-3xl mx-auto">
            <p className="eyebrow text-ember mb-4">TODO, swap in first case study</p>
            <h3 className="font-display text-2xl md:text-3xl text-ink leading-snug mb-4">
              First inbound case study, in flight.
            </h3>
            <p className="text-ink-700 leading-relaxed max-w-xl mx-auto mb-8">
              Pilot service businesses are running Qwikly on their sites now. We will publish the first end-to-end case study, leads captured, qualifying questions answered, contact info delivered, once the pilot completes its first 90 days.
            </p>
            <CTAButton href="/case-studies" variant="primary" size="md">
              See case studies
            </CTAButton>
          </div>
        </div>
      </section>

      {/* PRICING SUMMARY */}
      <section className="py-28 bg-paper-deep grain border-t border-b border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">Pricing</p>
            <h2 className="display-lg text-ink">
              Three tiers,
              <br />
              <em className="italic font-light">flat ZAR pricing.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-xl">
              Pick a tier, go live in 24 hours, cancel anytime. The under-60-second reply is included with every tier. Full feature breakdown lives on the pricing page.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto items-stretch">
            {tiers.map((tier) => (
              <div
                key={tier.id}
                className={`relative flex flex-col ${tier.highlight ? "ed-card-ink pt-10" : "ed-card-ghost"}`}
              >
                {tier.highlight && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
                    <span className="eyebrow bg-ember text-paper px-4 py-1.5 rounded-full whitespace-nowrap">
                      Most Popular
                    </span>
                  </div>
                )}

                <p className={`eyebrow mb-1 ${tier.highlight ? "text-ember" : "text-ink-500"}`}>
                  {tier.name}
                </p>
                <p className={`text-sm leading-snug mb-8 ${tier.highlight ? "text-paper/65" : "text-ink-700"}`}>
                  {tier.tagline}
                </p>

                <div className="mb-8">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span
                      className={`font-display font-medium leading-none ${tier.highlight ? "text-paper" : "text-ink"}`}
                      style={{ fontSize: "clamp(2rem, 3.5vw, 2.6rem)" }}
                    >
                      {tier.price}
                    </span>
                    <span className={`text-sm ${tier.highlight ? "text-paper/50" : "text-ink-500"}`}>
                      per month
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-12 flex justify-center">
            <CTAButton href="/pricing" variant="solid" size="lg">
              See full pricing
            </CTAButton>
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

      {/* FINAL CTA */}
      <section className="relative py-32 bg-ink text-paper overflow-hidden grain-dark">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2" aria-hidden="true" />
        <div className="dot-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <h2 className="display-xl text-paper max-w-[20ch] mx-auto">
            Try Qwikly{" "}
            <em className="italic font-light text-ember">free for 7 days.</em>
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-2xl mx-auto leading-relaxed">
            Live on your website in 24 hours. No card-on-file, no lock-in. If it does not produce real, emailed leads, walk away.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton href="/get-started" variant="solid" size="lg">
              Try Qwikly free for 7 days
            </CTAButton>
            <CTAButton href="/pipeline" variant="outline-light" size="lg" withArrow={false}>
              See Pipeline if you also want outbound
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
