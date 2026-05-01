import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About",
  description:
    "Qwikly is a South African AI website assistant built for local businesses. Learn who we are, why we built this, and how we operate.",
  alternates: { canonical: "https://www.qwikly.co.za/about" },
};

export default function AboutPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">About Qwikly</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-8">
            Built for SA businesses<br />
            <em className="italic font-light">that can&rsquo;t afford to miss a lead.</em>
          </h1>

          <div className="bg-paper-deep border border-ink/[0.07] rounded-2xl p-6 mb-16">
            <p className="text-ink-700 leading-relaxed text-base">
              Qwikly exists because every local business I know loses leads the same way: a potential
              customer visits their website, has a question, and leaves when nobody answers. We built a
              digital assistant platform that lives on your website, greets every visitor, qualifies the lead, and
              delivers it to your inbox. So you never lose a customer to silence again.
            </p>
          </div>

          <div className="space-y-14">
            {/* Who we are */}
            <div>
              <p className="eyebrow text-ember mb-3">01</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Who We Are
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Qwikly is operated by <strong className="text-ink">Clarke Agency</strong>, a
                  Johannesburg-based digital services business. Founded by Liam Clarke, Clarke Agency
                  builds technology that gives small local businesses the same front-office capability
                  as large companies, without the overhead.
                </p>
                <p>
                  We are a small team. Every client gets a real human who knows their setup and can
                  help them when things go sideways.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* What we're building */}
            <div>
              <p className="eyebrow text-ember mb-3">02</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                What We&rsquo;re Building
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  A digital assistant platform for your website. A visitor lands on your site. Qwikly greets
                  them, asks the right qualifying questions, captures their contact details, and
                  delivers a warm lead to your inbox. You get one email, with a one-click confirmation
                  button. The whole process takes seconds.
                </p>
                <p>
                  Flat monthly pricing, no per-job fees, no commissions, and no surprises. Plans
                  start from R0/month on Starter and R599/month on Pro.{" "}
                  <Link href="/pricing" className="text-ember underline transition-colors">
                    See pricing
                  </Link>
                  .
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
                    className="text-ember underline transition-colors"
                  >
                    hello@qwikly.co.za
                  </a>
                </div>
                <div className="flex gap-6">
                  <span className="eyebrow text-ink-500 w-28 shrink-0">Data Officer</span>
                  <span>Liam Clarke, liamclarke21@outlook.com</span>
                </div>
              </div>
            </div>

            <div className="rule" />

            {/* POPIA */}
            <div>
              <p className="eyebrow text-ember mb-3">04</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Privacy &amp; POPIA
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  We take data protection seriously. Clarke Agency is registered as a responsible party
                  under POPIA. All personal information we process, including visitor data captured
                  by the Qwikly digital assistant, is described in our{" "}
                  <Link
                    href="/legal/privacy"
                    className="text-ember underline transition-colors"
                  >
                    Privacy Policy
                  </Link>
                  . All data is processed and stored in South Africa.
                </p>
                <p>
                  If you have a question about your data or want to make a data request, email{" "}
                  <a
                    href="mailto:liamclarke21@outlook.com"
                    className="text-ember underline transition-colors"
                  >
                    liamclarke21@outlook.com
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* Coming soon: channels */}
            <div>
              <p className="eyebrow text-ember mb-3">05</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                What&rsquo;s Coming
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Qwikly currently operates as a digital assistant platform with email lead delivery.
                  WhatsApp routing and calendar integration are on the roadmap for Q3 2026.
                  Premium plan subscribers will get early access.
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
                href="/pricing"
                className="inline-flex items-center gap-2 px-6 py-3 bg-ink/[0.06] text-ink border border-ink/10 rounded-xl font-medium text-sm hover:bg-ink/10 transition-colors cursor-pointer"
              >
                See plans
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
