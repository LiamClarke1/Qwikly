import { Check, Target, Mail, Inbox, Banknote, MousePointerClick, MailX, Calendar, Zap, Reply, type LucideIcon } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import PipelineHero from "@/components/pipeline/PipelineHero";
import PipelineFAQ, { type FAQItem } from "@/components/pipeline/PipelineFAQ";
import PipelineCalculatorSection from "@/components/pipeline-calculator/PipelineCalculatorSection";

const problems: { Icon: LucideIcon; title: string; body: string }[] = [
  {
    Icon: Banknote,
    title: "Sales reps are expensive and burn out fast",
    body: "Sales reps cost R70,000+ per year and burn out at 20 personal emails a day.",
  },
  {
    Icon: MousePointerClick,
    title: "Marketing brings clicks, not booked calls",
    body: "Marketing brings in clicks, not booked calls. Founders end up doing sales themselves.",
  },
  {
    Icon: MailX,
    title: "Generic cold email is dead",
    body: "Generic cold email is dead. Mass templates land in spam.",
  },
];

const systemColumns: { Icon: LucideIcon; title: string; body: string; bullets: string[] }[] = [
  {
    Icon: Target,
    title: "Targeting and enrichment",
    body: "We pull from multiple data sources, filter to your exact ICP, layer in intent signals, and verify every contact before we touch them.",
    bullets: [
      "Multiple data sources",
      "ICP filtering",
      "Intent signals",
      "Verified contact info",
      "Full prospect profile",
    ],
  },
  {
    Icon: Mail,
    title: "Personalized outreach",
    body: "Every email is written for the specific person, not first-name merge tags. Three emails over six days, soft CTAs only, written to start a conversation.",
    bullets: [
      "Written per prospect",
      "No mass templates",
      "3 emails over 6 days",
      "Soft CTAs only",
      "Reply-driven, not click-driven",
    ],
  },
  {
    Icon: Inbox,
    title: "Deliverability infrastructure",
    body: "Multiple sending domains, two-week warmup, daily inbox checks. Your messages land in the primary inbox, not promotions, not spam.",
    bullets: [
      "Multiple sending domains",
      "Two-week warmup",
      "Daily inbox placement checks",
      "Primary-inbox placement",
      "SPF, DKIM, DMARC handled",
    ],
  },
];

const numbers: { Icon: LucideIcon; stat: string; label: string; estimate: boolean }[] = [
  {
    Icon: Calendar,
    stat: "15 to 30",
    label: "qualified meetings per month per client",
    estimate: true,
  },
  {
    Icon: Reply,
    stat: "4 to 15%",
    label: "reply rate, vs 0.5% industry average",
    estimate: true,
  },
  {
    Icon: Zap,
    stat: "Under 60s",
    label: "reply window when prospects respond",
    estimate: false,
  },
];

const tiers: {
  id: "lite" | "pro";
  name: string;
  tagline: string;
  setup: string;
  monthly: string;
  features: string[];
  highlight: boolean;
  cta: string;
  ctaHref: string;
}[] = [
  {
    id: "lite",
    name: "Pipeline Lite",
    tagline: "One ICP, one campaign, monthly review",
    setup: "R7,500",
    monthly: "R7,500",
    highlight: false,
    cta: "Start with Lite",
    ctaHref: "/contact?subject=pipeline-lite",
    features: [
      "Up to 1,500 prospects per month",
      "One ICP",
      "One campaign",
      "Monthly review call",
      "Deliverability infrastructure included",
      "POPIA compliance handled",
    ],
  },
  {
    id: "pro",
    name: "Pipeline Pro",
    tagline: "Multi-ICP, AB tested, weekly review",
    setup: "R7,500",
    monthly: "R15,000",
    highlight: true,
    cta: "Start with Pro",
    ctaHref: "/contact?subject=pipeline-pro",
    features: [
      "Up to 5,000 prospects per month",
      "Multi-ICP",
      "AB tested copy",
      "Weekly review call",
      "Dedicated Slack channel",
      "Deliverability infrastructure included",
      "POPIA compliance handled",
    ],
  },
];

const timeline: { week: string; title: string; body: string }[] = [
  {
    week: "Week 1",
    title: "Define and build",
    body: "Define your ICP, build your lead list, write your sequences.",
  },
  {
    week: "Week 2",
    title: "Launch",
    body: "Launch first campaign, monitor deliverability.",
  },
  {
    week: "Weeks 3 to 8",
    title: "Refine and scale",
    body: "AB test copy, refine ICP, scale sending.",
  },
  {
    week: "Week 9 onward",
    title: "Dialled in",
    body: "15 to 30 booked meetings per month, dialled in.",
  },
];

const faqs: FAQItem[] = [
  {
    question: "Is cold email still legal in SA under POPIA?",
    answer:
      "Yes, with the right framing. POPIA allows business-to-business outreach under legitimate interest, provided every email has a clear opt-out and you respect any direct marketing requests. We handle the compliance side for you, including suppression lists, opt-out routing, and POPIA-aligned copy.",
  },
  {
    question: "How long until I see meetings?",
    answer:
      "First replies usually start landing inside two weeks of the first send. Full ramp, where the system is dialled in and consistently producing meetings, typically lands by month 3 once we have AB tested copy across your ICPs.",
  },
  {
    question: "Do you guarantee meetings?",
    answer:
      "Yes. If we do not book you 5 qualified meetings in your first 60 days, your third month is free. See the risk reversal under pricing for the full terms.",
  },
  {
    question: "Can I see the system before I commit?",
    answer:
      "Yes. The strategy call walks you through Mission Control, our internal dashboard, so you can see the lead list, the sequences, the deliverability monitors, and the inbox in real time before you commit.",
  },
];

export default function PipelinePage() {
  return (
    <div className="bg-paper">

      {/* HERO */}
      <PipelineHero />

      {/* PROBLEM */}
      <section className="py-28 bg-paper-deep grain overflow-hidden border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">The problem</p>
            <h2 className="display-lg text-ink">
              Outbound is broken,
              <br />
              <em className="italic font-light">and founders are paying the price.</em>
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

      {/* SYSTEM */}
      <section id="system" className="py-28 grain overflow-hidden">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ember mb-6">The system</p>
            <h2 className="display-lg text-ink">
              A real pipeline,
              <br />
              <em className="italic font-light">built end to end.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-xl">
              Qwikly Pipeline is not a tool you log into. It is a managed system that runs in the background and books meetings on your calendar.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systemColumns.map(({ Icon, title, body, bullets }) => (
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

      {/* WHAT YOU GET */}
      <section className="py-28 bg-ink text-paper grain-dark relative overflow-hidden">
        <div className="ember-blob w-[700px] h-[400px] top-0 left-1/2 -translate-x-1/2 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ember mb-6">What you get</p>
            <h2 className="display-lg text-paper">
              Numbers we work to,
              <br />
              <em className="italic font-light text-ember">tracked weekly.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {numbers.map(({ Icon, stat, label, estimate }) => (
              <div key={label} className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-8">
                <div className="w-11 h-11 rounded-xl bg-ember/15 flex items-center justify-center mb-6">
                  <Icon className="w-5 h-5 text-ember" strokeWidth={1.75} aria-hidden />
                </div>
                <p
                  className="font-display font-medium text-ember leading-none mb-4"
                  style={{ fontSize: "clamp(2.25rem, 4vw, 3rem)" }}
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
        </div>
      </section>

      {/* FORECAST CALCULATOR */}
      <PipelineCalculatorSection />

      {/* PROOF / CASE STUDY PLACEHOLDER */}
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
            <p className="eyebrow text-ember mb-4">TODO, swap in real case study</p>
            <h3 className="font-display text-2xl md:text-3xl text-ink leading-snug mb-4">
              Case study coming soon.
            </h3>
            <p className="text-ink-700 leading-relaxed max-w-xl mx-auto">
              Pilot client onboarding now. We will publish the first end-to-end case study, ICP, sequences, reply rate, meetings booked, here once the pilot completes its first 90 days.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section className="py-28 bg-paper-deep grain border-t border-b border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">Pricing</p>
            <h2 className="display-lg text-ink">
              Two tiers,
              <br />
              <em className="italic font-light">flat ZAR pricing.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto items-stretch">
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
                      {tier.monthly}
                    </span>
                    <span className={`text-sm ${tier.highlight ? "text-paper/50" : "text-ink-500"}`}>
                      per month
                    </span>
                  </div>
                  <p className={`text-xs mt-2 ${tier.highlight ? "text-paper/55" : "text-ink-500"}`}>
                    Plus {tier.setup} one-time setup
                  </p>
                </div>

                <ul className="flex-1 space-y-3 mb-8">
                  {tier.features.map((feature, i) => (
                    <li
                      key={i}
                      className={`flex items-start gap-3 text-sm leading-relaxed ${
                        tier.highlight ? "text-paper/85" : "text-ink-700"
                      }`}
                    >
                      <Check
                        className="w-4 h-4 mt-0.5 flex-shrink-0 text-ember"
                        strokeWidth={2.5}
                        aria-hidden
                      />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <CTAButton
                  href={tier.ctaHref}
                  variant={tier.highlight ? "solid" : "primary"}
                  size="md"
                  className="w-full justify-center"
                >
                  {tier.cta}
                </CTAButton>
              </div>
            ))}
          </div>

          {/* Risk reversal */}
          <div className="mt-12 max-w-3xl mx-auto rounded-2xl border border-ember/25 bg-ember/[0.06] p-8 md:p-10 text-center">
            <p className="eyebrow text-ember mb-3">Risk reversal</p>
            <p className="font-display text-xl md:text-2xl text-ink leading-snug">
              If we do not book you 5 qualified meetings in your first 60 days, your third month is free.
            </p>
          </div>
        </div>
      </section>

      {/* PROCESS TIMELINE */}
      <section className="py-28 grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">Process</p>
            <h2 className="display-lg text-ink">
              From kickoff
              <br />
              <em className="italic font-light">to dialled in.</em>
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-4 gap-6">
            {timeline.map((step, i) => (
              <div key={step.week} className="relative ed-card-ghost">
                <span className="absolute -top-3 left-6 inline-flex items-center justify-center w-8 h-8 rounded-full bg-ink text-paper font-display text-sm">
                  {i + 1}
                </span>
                <p className="eyebrow text-ember mt-3 mb-3">{step.week}</p>
                <h3 className="font-display text-xl text-ink leading-snug mb-3">{step.title}</h3>
                <p className="text-ink-700 text-sm leading-relaxed">{step.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-28 bg-paper-deep grain border-t border-ink/[0.06]">
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
          <h2 className="display-xl text-paper max-w-[20ch] mx-auto">
            Book a{" "}
            <em className="italic font-light text-ember">strategy call</em>.
          </h2>
          <p className="text-paper/70 text-lg mt-8 max-w-2xl mx-auto leading-relaxed">
            We will map your ICP and show you what the first campaign looks like, free of charge.
          </p>
          <div className="mt-12 flex flex-col sm:flex-row gap-4 justify-center">
            <CTAButton
              href="/contact?subject=pipeline-strategy-call"
              variant="solid"
              size="lg"
            >
              Book a strategy call
            </CTAButton>
            <CTAButton
              href="#system"
              variant="outline-light"
              size="lg"
              withArrow={false}
            >
              See the system
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
