import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Qwikly is a South African AI receptionist built for trades businesses. Learn who we are, why we built this, and how we operate.",
  alternates: { canonical: "https://www.qwikly.co.za/about" },
};

export default function AboutPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">About Qwikly</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-8">
            Built by a tradesperson&rsquo;s son,<br />
            <em className="italic font-light">for tradespeople.</em>
          </h1>

          <div className="bg-paper-deep border border-ink/[0.07] rounded-2xl p-6 mb-16">
            <p className="text-ink-700 leading-relaxed text-base">
              Qwikly exists because every contractor I know loses work the same way: a lead sends a
              WhatsApp at 7 p.m. while they&rsquo;re under a sink, and by 8 p.m. that customer has already
              booked the next person who answered. We built an AI that answers first, qualifies the
              lead, and locks in the job, so tradespeople can focus on the work.
            </p>
          </div>

          <div className="space-y-14">
            {/* Founder */}
            <div>
              <p className="eyebrow text-ember mb-3">01</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Who We Are
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Qwikly is operated by <strong className="text-ink">Clarke Agency</strong>, a
                  Johannesburg-based digital services business. Founded by Liam Clarke, Clarke Agency
                  builds technology that gives small service businesses the same front-office capability
                  as large companies, without the overhead.
                </p>
                <p>
                  We are a small team. Every client gets a real human who knows their setup and can
                  help them when things go sideways.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* Mission */}
            <div>
              <p className="eyebrow text-ember mb-3">02</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                What We&rsquo;re Building
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  A fully automated front office for South African service businesses. A lead comes in
                  on WhatsApp or email. Qwikly replies in 30 seconds, qualifies the job, offers real
                  calendar slots, confirms the booking, sends reminders, and recovers no-shows, all
                  without the business owner touching their phone.
                </p>
                <p>
                  We charge only when a booking happens: 8% of the job value, minimum R150, maximum
                  R5,000. No monthly fee. No card required during the 7-day trial. If Qwikly doesn&rsquo;t
                  book jobs, it costs nothing.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* Business details */}
            <div>
              <p className="eyebrow text-ember mb-3">03</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Business Details
              </h2>
              <div className="bg-paper-deep border border-ink/[0.07] rounded-2xl p-6 space-y-4 text-sm text-ink-700">
                <div className="flex gap-6">
                  <span className="eyebrow text-ink-500 w-28 shrink-0">Trading as</span>
                  <span>Qwikly (a product of Clarke Agency)</span>
                </div>
                <div className="flex gap-6">
                  <span className="eyebrow text-ink-500 w-28 shrink-0">Location</span>
                  <span>Johannesburg, South Africa</span>
                </div>
                <div className="flex gap-6">
                  <span className="eyebrow text-ink-500 w-28 shrink-0">CIPC Reg</span>
                  <span className="text-ink-400 italic">__________</span>
                </div>
                <div className="flex gap-6">
                  <span className="eyebrow text-ink-500 w-28 shrink-0">VAT Number</span>
                  <span className="text-ink-400 italic">Not yet registered</span>
                </div>
                <div className="flex gap-6">
                  <span className="eyebrow text-ink-500 w-28 shrink-0">Email</span>
                  <a
                    href="mailto:hello@qwikly.co.za"
                    className="text-ember hover:underline transition-colors"
                  >
                    hello@qwikly.co.za
                  </a>
                </div>
                <div className="flex gap-6">
                  <span className="eyebrow text-ink-500 w-28 shrink-0">Data Officer</span>
                  <span>Liam Clarke &mdash; liamclarke21@outlook.com</span>
                </div>
              </div>
            </div>

            <div className="rule" />

            {/* WhatsApp / Meta disclosure */}
            <div>
              <p className="eyebrow text-ember mb-3">04</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                WhatsApp &amp; Meta Platform
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Qwikly connects your business to the WhatsApp Business Platform via Meta&rsquo;s official
                  Cloud API. We are not affiliated with, endorsed by, or a representative of Meta
                  Platforms, Inc. WhatsApp is a trademark of Meta Platforms, Inc.
                </p>
                <p>
                  All WhatsApp messaging through Qwikly is subject to Meta&rsquo;s{" "}
                  <a
                    href="https://www.whatsapp.com/legal/business-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ember hover:underline transition-colors"
                  >
                    WhatsApp Business Policy
                  </a>{" "}
                  and{" "}
                  <a
                    href="https://www.whatsapp.com/legal/commerce-policy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ember hover:underline transition-colors"
                  >
                    Commerce Policy
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* POPIA */}
            <div>
              <p className="eyebrow text-ember mb-3">05</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Privacy &amp; POPIA
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  We take data protection seriously. Clarke Agency is registered as a responsible party
                  under POPIA. All personal information we process is described in our{" "}
                  <Link
                    href="/legal/privacy"
                    className="text-ember hover:underline transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  . If you have a question about your data or want to make a data request, email{" "}
                  <a
                    href="mailto:liamclarke21@outlook.com"
                    className="text-ember hover:underline transition-colors"
                  >
                    liamclarke21@outlook.com
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="rule" />

            <div className="flex gap-4 pt-2">
              <Link
                href="/contact"
                className="inline-flex items-center gap-2 px-6 py-3 bg-ember text-paper rounded-xl font-medium text-sm hover:bg-ember/90 transition-colors cursor-pointer"
              >
                Get in touch
              </Link>
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink/[0.06] text-ink border border-ink/10 rounded-xl font-medium text-sm hover:bg-ink/10 transition-colors cursor-pointer"
              >
                Start free trial
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
