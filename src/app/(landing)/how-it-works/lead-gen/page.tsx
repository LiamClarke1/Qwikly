import type { Metadata } from "next";
import {
  Target,
  Mail,
  Inbox,
  Check,
  Zap,
  PlayCircle,
  Calendar,
  Reply,
  TrendingUp,
  EyeOff,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import CTAButton from "@/components/CTAButton";

export const metadata: Metadata = {
  title: "How Qwikly Pipeline works, the lead-gen methodology",
  description:
    "How Qwikly Pipeline works, the lead-gen methodology. Targeting, personalisation, deliverability, a 3-email cadence over 6 days, the 60-second response rule, and the pre-call asset.",
  alternates: {
    canonical: "https://www.qwikly.co.za/how-it-works/lead-gen",
  },
  openGraph: {
    title: "How Qwikly Pipeline works, the lead-gen methodology",
    description:
      "Three connected systems, a 3-email cadence, a 60-second response rule. The full Qwikly Pipeline playbook.",
    url: "https://www.qwikly.co.za/how-it-works/lead-gen",
  },
};

type SystemBlock = {
  Icon: LucideIcon;
  index: string;
  title: string;
  oneLiner: string;
  bullets: string[];
  whyItMatters: string;
};

const systems: SystemBlock[] = [
  {
    Icon: Target,
    index: "01",
    title: "Targeting and enrichment",
    oneLiner: "We do not buy lists. We build them, every campaign.",
    bullets: [
      "Multiple data sources cross-referenced for the right person, the right title, the right company.",
      "Intent signals layered in (recent hires, recent fundraising, technology stack changes, growth indicators).",
      "Verified email and phone for every prospect. Bouncers never enter the campaign.",
      "Rich profile per prospect, what they do, what they need, what they are likely to respond to.",
    ],
    whyItMatters:
      "Garbage in, garbage out. The icebreaker is only as good as the data.",
  },
  {
    Icon: Mail,
    index: "02",
    title: "Personalisation engine",
    oneLiner: "Hyper-personalised, not first-name merge tags.",
    bullets: [
      "Every email is written for the specific person. The icebreaker references something only someone in their inner circle would know.",
      "Multiple prompt layers ensure the email reads like a human wrote it, not a template.",
      "Value proposition matched to their likely pain, not a generic pitch.",
      "Soft CTAs only. We never demand a meeting, we offer an alternative ('or I can send a 4 minute video, your call').",
    ],
    whyItMatters:
      "The reply rate is the number that matters. Open rates lie, replies pay.",
  },
  {
    Icon: Inbox,
    index: "03",
    title: "Sending infrastructure and deliverability",
    oneLiner: "The best email in the world is worthless if it lands in spam.",
    bullets: [
      "Multiple sending domains rotate to spread risk.",
      "Two-week warmup is non-negotiable before a campaign sends.",
      "Daily deliverability checks on every domain, every account.",
      "Inbox rotation across accounts to keep volumes safe.",
    ],
    whyItMatters:
      "Most beginners blast from a single domain and end up in spam within a week. We do not.",
  },
];

type CadenceStep = {
  day: string;
  index: string;
  title: string;
  body: string;
  wordTarget: string;
  subjectLine: string;
};

const cadence: CadenceStep[] = [
  {
    day: "Day 0",
    index: "Email 1",
    title: "Hyper-personal icebreaker",
    body: "Reads like a 1:1 note. Opens with something specific to them. Ends with a soft CTA.",
    wordTarget: "Under 120 words",
    subjectLine: "Ambiguous, never clickbait.",
  },
  {
    day: "Day 3",
    index: "Email 2",
    title: "TL;DR follow-up",
    body: "Short, punchy recap of value. Threaded to email 1.",
    wordTarget: "Under 80 words",
    subjectLine: "Re-thread or short refresh.",
  },
  {
    day: "Day 6",
    index: "Email 3",
    title: "Breakup",
    body: "We do not pester. This is the last note. Often the highest-converting touch in the sequence.",
    wordTarget: "Under 60 words",
    subjectLine: "Closing the loop, parking this.",
  },
];

type FirstNinetyDays = {
  range: string;
  title: string;
  body: string;
  estimate: boolean;
};

const firstNinetyDays: FirstNinetyDays[] = [
  {
    range: "Days 1 to 14",
    title: "Build and launch",
    body: "Define ICP, build the lead list, write the sequences, set up infrastructure, launch first campaign.",
    estimate: false,
  },
  {
    range: "Days 15 to 60",
    title: "Refine",
    body: "Replies start, AB tests run, ICP and copy refine, deliverability tuned.",
    estimate: false,
  },
  {
    range: "Days 60 to 90",
    title: "Dialled in",
    body: "15 to 30 qualified meetings per month, dialled in.",
    estimate: true,
  },
];

const willNotDo: string[] = [
  "We will not buy a list and blast it. That is what got everyone else in spam.",
  "We will not send the same email to 10,000 people. Even with templates, every email is rewritten.",
  "We will not use first-name merge tags as a personalisation strategy. They are a tell.",
  "We will not promise meetings if your offer is below R2,000 ticket. The maths does not work for either of us.",
];

const metricsTracked: { Icon: LucideIcon; label: string; note: string }[] = [
  { Icon: Reply, label: "Reply rate", note: "The number that matters." },
  { Icon: Calendar, label: "Qualified-meeting rate", note: "Replies that turn into a real call." },
  { Icon: Check, label: "Booked-call show rate", note: "Did they actually turn up?" },
  { Icon: TrendingUp, label: "Deal close rate", note: "Calls that turn into clients." },
  { Icon: Zap, label: "Revenue attributed", note: "ZAR through the door from Pipeline." },
];

export default function LeadGenMethodologyPage() {
  return (
    <div className="bg-paper">
      {/* HERO */}
      <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 grain overflow-hidden">
        <div className="ember-blob w-[700px] h-[460px] -top-20 -right-40 opacity-60" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <p className="eyebrow text-ember mb-6">How Qwikly Pipeline works</p>
          <h1 className="display-xl text-ink max-w-[22ch]">
            The system that puts qualified sales calls{" "}
            <em className="italic font-light">on your calendar.</em>
          </h1>
          <p className="mt-8 text-lg text-ink-700 max-w-2xl leading-relaxed">
            Three connected systems, one outcome. Here is the playbook we run for every Pipeline client.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-4">
            <CTAButton
              href="/contact?subject=pipeline-strategy-call"
              variant="solid"
              size="lg"
            >
              Book a strategy call
            </CTAButton>
            <CTAButton
              href="/pipeline#pricing"
              variant="outline"
              size="lg"
              withArrow={false}
            >
              See pricing
            </CTAButton>
          </div>
        </div>
      </section>

      {/* THE 3 SYSTEMS */}
      <section id="systems" className="py-28 grain overflow-hidden border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">The three systems</p>
            <h2 className="display-lg text-ink">
              Targeting, personalisation, deliverability,
              <br />
              <em className="italic font-light">all working in concert.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {systems.map(({ Icon, index, title, oneLiner, bullets, whyItMatters }) => (
              <div key={title} className="ed-card flex flex-col">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-11 h-11 rounded-xl bg-ink/[0.05] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-ink" strokeWidth={1.75} aria-hidden />
                  </div>
                  <span className="eyebrow text-ink-500">{index}</span>
                </div>
                <h3 className="font-display text-2xl text-ink leading-snug mb-3">{title}</h3>
                <p className="text-ink-700 text-sm leading-relaxed mb-6 italic">
                  {oneLiner}
                </p>
                <ul className="space-y-2.5 mb-6">
                  {bullets.map((b) => (
                    <li key={b} className="flex items-start gap-2.5 text-sm text-ink-700 leading-relaxed">
                      <Check className="w-4 h-4 mt-0.5 text-ember flex-shrink-0" strokeWidth={2.5} aria-hidden />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-auto pt-5 border-t border-ink/[0.08]">
                  <p className="eyebrow text-ember mb-2">Why it matters</p>
                  <p className="text-sm text-ink-700 leading-relaxed">{whyItMatters}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* THE 3-EMAIL CADENCE */}
      <section className="py-28 bg-paper-deep grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">The cadence</p>
            <h2 className="display-lg text-ink">
              Three emails over six days,
              <br />
              <em className="italic font-light">no pestering.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-xl">
              Short, soft, written for one person. Each touch has a job, and we never overstay our welcome in the inbox.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {cadence.map(({ day, index, title, body, wordTarget, subjectLine }) => (
              <div key={index} className="ed-card-ghost flex flex-col">
                <div className="flex items-baseline justify-between mb-5">
                  <span className="eyebrow text-ember">{day}</span>
                  <span className="eyebrow text-ink-500">{index}</span>
                </div>
                <h3 className="font-display text-xl text-ink leading-snug mb-3">{title}</h3>
                <p className="text-ink-700 text-sm leading-relaxed mb-6">{body}</p>

                <dl className="mt-auto space-y-3 text-sm">
                  <div className="flex items-start gap-3">
                    <dt className="eyebrow text-ink-500 w-24 flex-shrink-0 pt-0.5">Length</dt>
                    <dd className="text-ink-700">{wordTarget}</dd>
                  </div>
                  <div className="flex items-start gap-3">
                    <dt className="eyebrow text-ink-500 w-24 flex-shrink-0 pt-0.5">Subject</dt>
                    <dd className="text-ink-700">{subjectLine}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 60-SECOND RESPONSE RULE */}
      <section className="py-28 bg-ink text-paper grain-dark relative overflow-hidden">
        <div className="ember-blob w-[800px] h-[500px] top-0 left-1/2 -translate-x-1/2 opacity-50" aria-hidden="true" />
        <div className="dot-grid absolute inset-0 opacity-50" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            <div className="lg:col-span-5">
              <p className="eyebrow text-ember mb-6">The 60-second rule</p>
              <div className="rounded-2xl border border-paper/10 bg-paper/[0.04] p-10">
                <p
                  className="font-display font-medium text-ember leading-none"
                  style={{ fontSize: "clamp(4rem, 9vw, 7rem)" }}
                >
                  21x
                </p>
                <p className="mt-6 text-paper/80 text-base leading-relaxed">
                  drop in conversion if you wait more than 60 seconds.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-paper/[0.06] border border-paper/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-ember" aria-hidden="true" />
                  <span className="eyebrow text-[9px] tracking-widest text-paper/70">industry estimate</span>
                </span>
              </div>
            </div>

            <div className="lg:col-span-6 lg:col-start-7">
              <h2 className="display-lg text-paper mb-6">
                When a prospect replies,
                <br />
                <em className="italic font-light text-ember">the clock is on.</em>
              </h2>
              <p className="text-paper/75 text-lg leading-relaxed">
                Qwikly Pipeline routes every reply to a real human inbox or your team in under a minute. No reply auto-pilot, no slow-burn handoff.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* THE PRE-CALL ASSET */}
      <section className="py-28 grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-12 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">The pre-call asset</p>
            <h2 className="display-lg text-ink">
              Curious but not ready,
              <br />
              <em className="italic font-light">we send a 4 minute walkthrough.</em>
            </h2>
            <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-xl">
              When a prospect is curious but not ready for a call, we send them a 4 minute walkthrough.
            </p>
          </div>

          <Link
            href="/watch"
            className="group block rounded-2xl border border-ink/10 bg-paper-deep p-8 md:p-10 max-w-3xl hover:border-ember/40 hover:bg-paper transition-colors"
          >
            <div className="flex items-start gap-6">
              <div className="w-14 h-14 rounded-xl bg-ember/15 flex items-center justify-center flex-shrink-0">
                <PlayCircle className="w-7 h-7 text-ember" strokeWidth={1.5} aria-hidden />
              </div>
              <div className="flex-1">
                <p className="eyebrow text-ember mb-2">Watch the walkthrough</p>
                <h3 className="font-display text-2xl text-ink leading-snug mb-2">
                  See the asset we send to warm prospects.
                </h3>
                <p className="text-ink-700 text-sm leading-relaxed">
                  Four minutes, no slides, the system end to end.
                </p>
              </div>
              <span className="eyebrow text-ink-500 group-hover:text-ember transition-colors hidden md:inline-block pt-2">
                Watch -&gt;
              </span>
            </div>
          </Link>
        </div>
      </section>

      {/* FIRST 90 DAYS */}
      <section className="py-28 bg-paper-deep grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-16 max-w-2xl">
            <p className="eyebrow text-ink-500 mb-6">The first 90 days</p>
            <h2 className="display-lg text-ink">
              From kickoff
              <br />
              <em className="italic font-light">to dialled in.</em>
            </h2>
          </div>

          <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
            {firstNinetyDays.map((step, i) => (
              <div key={step.range} className="relative ed-card-ghost">
                <span className="absolute -top-3 left-6 inline-flex items-center justify-center w-8 h-8 rounded-full bg-ink text-paper font-display text-sm">
                  {i + 1}
                </span>
                <p className="eyebrow text-ember mt-3 mb-3">{step.range}</p>
                <h3 className="font-display text-xl text-ink leading-snug mb-3">{step.title}</h3>
                <p className="text-ink-700 text-sm leading-relaxed mb-4">{step.body}</p>
                {step.estimate && (
                  <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-ink/[0.04] border border-ink/10">
                    <span className="w-1.5 h-1.5 rounded-full bg-ember" aria-hidden="true" />
                    <span className="eyebrow text-[9px] tracking-widest text-ink-600">industry estimate</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* WHAT WE WILL NOT DO */}
      <section className="py-28 grain border-t border-ink/[0.06]">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            <div className="md:col-span-4">
              <p className="eyebrow text-ink-500 mb-6">An honest list</p>
              <h2 className="display-lg text-ink">
                What we
                <br />
                <em className="italic font-light">will not do.</em>
              </h2>
            </div>
            <div className="md:col-span-8 md:col-start-5">
              <ul className="space-y-5">
                {willNotDo.map((line) => (
                  <li
                    key={line}
                    className="flex items-start gap-4 rounded-2xl border border-ink/10 bg-paper-deep p-6"
                  >
                    <span
                      className="w-6 h-6 rounded-full bg-ember/15 text-ember flex items-center justify-center flex-shrink-0 mt-0.5 font-display text-sm"
                      aria-hidden
                    >
                      x
                    </span>
                    <p className="text-ink leading-relaxed">{line}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* METRICS */}
      <section className="py-28 bg-ink text-paper grain-dark relative overflow-hidden">
        <div className="ember-blob w-[700px] h-[400px] top-0 right-0 opacity-30" aria-hidden="true" />
        <div className="relative mx-auto max-w-site px-6 lg:px-10">
          <div className="mb-14 max-w-2xl">
            <p className="eyebrow text-ember mb-6">Metrics</p>
            <h2 className="display-lg text-paper">
              The numbers we track,
              <br />
              <em className="italic font-light text-ember">and the one we ignore.</em>
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7">
              <p className="eyebrow text-paper/50 mb-5">We track</p>
              <ul className="space-y-3">
                {metricsTracked.map(({ Icon, label, note }) => (
                  <li
                    key={label}
                    className="flex items-start gap-4 rounded-2xl border border-paper/10 bg-paper/[0.03] p-5"
                  >
                    <div className="w-10 h-10 rounded-xl bg-ember/15 flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-ember" strokeWidth={1.75} aria-hidden />
                    </div>
                    <div>
                      <p className="font-display text-lg text-paper leading-snug">{label}</p>
                      <p className="text-paper/65 text-sm leading-relaxed">{note}</p>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-6 text-paper/45 text-xs leading-relaxed">
                Where any benchmark is mentioned, treat it as an industry estimate. Individual results will vary.
              </p>
            </div>

            <div className="lg:col-span-5">
              <p className="eyebrow text-paper/50 mb-5">We do not track</p>
              <div className="rounded-2xl border border-paper/10 bg-paper/[0.03] p-7">
                <div className="w-11 h-11 rounded-xl bg-paper/[0.06] flex items-center justify-center mb-5">
                  <EyeOff className="w-5 h-5 text-paper/70" strokeWidth={1.75} aria-hidden />
                </div>
                <p className="font-display text-xl text-paper leading-snug mb-3">Open rate</p>
                <p className="text-paper/65 text-sm leading-relaxed">
                  Open rate kills deliverability and lies anyway. We optimise for replies, qualified meetings, and revenue, not vanity numbers.
                </p>
                <span className="mt-5 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-paper/[0.06] border border-paper/15">
                  <span className="w-1.5 h-1.5 rounded-full bg-ember" aria-hidden="true" />
                  <span className="eyebrow text-[9px] tracking-widest text-paper/70">industry estimate</span>
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-32 bg-paper-deep grain overflow-hidden border-t border-ink/[0.06]">
        <div className="relative mx-auto max-w-site px-6 lg:px-10 text-center">
          <p className="eyebrow text-ink-500 mb-6">Your move</p>
          <h2 className="display-xl text-ink max-w-[22ch] mx-auto">
            Want to see how this maps{" "}
            <em className="italic font-light">to your business?</em>
          </h2>
          <p className="text-ink-700 text-lg md:text-xl mt-8 max-w-2xl mx-auto leading-relaxed">
            Book a 30 minute strategy call. We will show you the exact ICP we would target and the kind of email we would send to your top 5 prospects, free of charge.
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
              href="/pipeline#pricing"
              variant="outline"
              size="lg"
              withArrow={false}
            >
              See Pipeline pricing
            </CTAButton>
          </div>
        </div>
      </section>
    </div>
  );
}
