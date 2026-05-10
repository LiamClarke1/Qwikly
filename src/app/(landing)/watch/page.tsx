import type { Metadata } from "next";
import { Check, ShieldCheck, MapPin, Banknote } from "lucide-react";
import CTAButton from "@/components/CTAButton";
import VideoEmbed from "@/components/watch/VideoEmbed";

export const metadata: Metadata = {
  title: "Qwikly walkthrough, the lead engine for SA service businesses",
  description:
    "A 4 minute walkthrough of Qwikly, the digital assistant that captures leads on your website at any hour and books them into your calendar. Built for South African service businesses, POPIA compliant, ZAR pricing.",
  robots: {
    index: true,
    follow: true,
  },
};

const bullets: string[] = [
  "Visitor lands on your site at 9pm with a burst geyser. Qwikly captures their name and number in under 60 seconds.",
  "WhatsApp pings the owner with a one tap reply that sends the booking link.",
  "Owner wakes up to a paying job on the calendar.",
];

const trustPills: { Icon: typeof ShieldCheck; label: string }[] = [
  { Icon: ShieldCheck, label: "POPIA compliant" },
  { Icon: MapPin, label: "Hosted in South Africa" },
  { Icon: Banknote, label: "ZAR pricing" },
];

export default function WatchPage() {
  return (
    <div className="bg-paper">
      {/* HERO, VIDEO, BULLETS */}
      <section className="py-24 md:py-28 grain overflow-hidden">
        <div className="mx-auto max-w-4xl px-6 lg:px-10">
          {/* EYEBROW + H1 */}
          <div className="mb-10 max-w-3xl">
            <p className="eyebrow text-ember mb-6">4 minute walkthrough</p>
            <h1 className="display-lg text-ink">
              How an SA plumber goes from 4 to 22 jobs per month{" "}
              <em className="italic font-light">with Qwikly.</em>
            </h1>
            <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-2xl">
              Watch the system end to end. If you would rather talk to a human, book a 15 minute call below.
            </p>
          </div>

          {/* VIDEO */}
          <VideoEmbed />

          {/* BULLETS */}
          <ul className="mt-10 space-y-4 max-w-3xl">
            {bullets.map((bullet) => (
              <li
                key={bullet}
                className="flex items-start gap-3 text-base md:text-lg text-ink-700 leading-relaxed"
              >
                <Check
                  className="w-5 h-5 mt-1 text-ember flex-shrink-0"
                  strokeWidth={2.5}
                  aria-hidden
                />
                <span>{bullet}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* CTA BLOCK */}
      <section className="relative py-24 md:py-28 bg-ink text-paper overflow-hidden grain-dark">
        <div
          className="ember-blob w-[700px] h-[400px] top-0 left-1/2 -translate-x-1/2 opacity-50"
          aria-hidden="true"
        />
        <div className="relative mx-auto max-w-3xl px-6 lg:px-10 text-center">
          <h2 className="display-lg text-paper">
            Want to see this{" "}
            <em className="italic font-light text-ember">on your website?</em>
          </h2>
          <p className="mt-6 text-paper/70 text-lg leading-relaxed max-w-xl mx-auto">
            Book a 15 minute call. We will map your top 3 lead types and quote you live.
          </p>
          <div className="mt-10 flex flex-col items-center gap-5">
            <CTAButton
              href="/contact?subject=watch-page-call-booking"
              variant="solid"
              size="lg"
            >
              Book a 15 minute call
            </CTAButton>
            <a
              href="/get-started"
              className="text-sm text-paper/70 hover:text-ember underline-offset-4 hover:underline transition-colors"
            >
              Or start the 7 day free trial yourself
            </a>
          </div>
        </div>
      </section>

      {/* TRUST STRIP */}
      <section className="py-14 bg-paper-deep border-t border-ink/[0.06] grain">
        <div className="mx-auto max-w-site px-6 lg:px-10">
          <div className="flex flex-wrap items-center justify-center gap-3">
            {trustPills.map(({ Icon, label }) => (
              <span
                key={label}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-ink/10 bg-paper text-ink-700"
              >
                <Icon className="w-4 h-4 text-ember" strokeWidth={2} aria-hidden />
                <span className="eyebrow text-[10px] tracking-widest text-ink-700">
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
