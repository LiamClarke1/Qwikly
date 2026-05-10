"use client";

import CTAButton from "@/components/CTAButton";

/* ─────────────────────────────────────────────────────────────
   TWO SERVICES SECTION
   Inbound (Qwikly Digital Assistant) + Outbound (Qwikly Pipeline)
   ───────────────────────────────────────────────────────────── */

type ServiceCard = {
  eyebrow: string;
  title: string;
  oneLiner: string;
  bullets: string[];
  priceLine: string;
  priceFootnote?: string;
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  serviceTag: string;
};

const services: ServiceCard[] = [
  {
    eyebrow: "Service 1, inbound",
    title: "Qwikly Digital Assistant",
    oneLiner:
      "Every visitor enquiry on your website, captured and answered in under 60 seconds.",
    bullets: [
      "Live on your website in 24 hours",
      "WhatsApp + SMS owner ping",
      "Qualifies leads before you respond",
      "POPIA compliant, hosted in SA",
    ],
    priceLine: "From R699/mo",
    primaryCta: { label: "See pricing", href: "/pricing" },
    secondaryCta: { label: "How it works", href: "/digital-assistant" },
    serviceTag: "Inbound",
  },
  {
    eyebrow: "Service 2, outbound",
    title: "Qwikly Pipeline",
    oneLiner:
      "We find your ideal buyers, write each one a personal email, and book qualified sales calls on your calendar.",
    bullets: [
      "15 to 30 booked meetings per month (industry estimate)",
      "Hyper-personalised outreach, never spray and pray",
      "Multiple sending domains, two-week warmup",
      "60-day meeting guarantee",
    ],
    priceLine: "From R7,500 setup + R7,500/mo",
    primaryCta: { label: "See Pipeline", href: "/pipeline" },
    secondaryCta: { label: "How it works", href: "/how-it-works/lead-gen" },
    serviceTag: "Outbound",
  },
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-4 h-4 flex-shrink-0 mt-0.5 text-ember"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

export function TwoServicesSection() {
  return (
    <section
      id="two-services"
      className="relative py-28 md:py-40 bg-paper grain overflow-hidden"
    >
      <div className="relative mx-auto max-w-site px-6 lg:px-10">
        {/* Header */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16 md:mb-20">
          <div className="md:col-span-6">
            <p className="eyebrow text-ink-500 mb-6 reveal-up">What Qwikly does</p>
            <h2 className="display-lg text-ink reveal-up max-w-[18ch]">
              Inbound and outbound,{" "}
              <em className="italic font-light">both handled</em>.
            </h2>
          </div>
          <div className="md:col-span-5 md:col-start-8 md:pt-2 reveal-up">
            <p className="text-lg text-ink-700 leading-relaxed">
              Qwikly is the lead engine for South African service businesses.
              Two complementary services, one mission. Pick one, run both, scale
              either when you&rsquo;re ready.
            </p>
          </div>
        </div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 reveal-stagger">
          {services.map((s) => (
            <article
              key={s.title}
              className="ed-card flex flex-col h-full p-7 md:p-9"
            >
              {/* Eyebrow + tag */}
              <div className="flex items-center justify-between mb-5">
                <p className="eyebrow text-ember">{s.eyebrow}</p>
                <span className="inline-flex items-center gap-1.5 text-[0.7rem] font-medium text-ink-500 px-2.5 py-1 rounded-full border border-ink/[0.10] bg-ink/[0.02]">
                  <span className="w-1.5 h-1.5 rounded-full bg-ember" />
                  {s.serviceTag}
                </span>
              </div>

              {/* Title */}
              <h3 className="font-display text-2xl md:text-3xl text-ink leading-tight mb-3">
                {s.title}
              </h3>

              {/* One liner */}
              <p className="text-ink-700 text-base leading-relaxed mb-6 max-w-[44ch]">
                {s.oneLiner}
              </p>

              {/* Bullets */}
              <ul className="space-y-3 mb-8 flex-1">
                {s.bullets.map((b) => (
                  <li
                    key={b}
                    className="flex items-start gap-3 text-sm leading-relaxed text-ink-700"
                  >
                    <CheckIcon />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>

              {/* Price */}
              <div className="mb-6 pt-5 border-t border-ink/[0.08]">
                <p className="font-display text-lg text-ink leading-tight">
                  {s.priceLine}
                </p>
                {s.priceFootnote && (
                  <p className="text-xs text-ink-500 mt-1">{s.priceFootnote}</p>
                )}
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-4">
                <CTAButton href={s.primaryCta.href} variant="solid" size="md">
                  {s.primaryCta.label}
                </CTAButton>
                <a
                  href={s.secondaryCta.href}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-ink hover:text-ember transition-colors"
                >
                  {s.secondaryCta.label}
                  <ArrowIcon />
                </a>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
