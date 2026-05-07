import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Hosting and Data Residency",
  description:
    "Where your Qwikly data lives, who runs the infrastructure, and how data residency in South Africa works in practice.",
  alternates: { canonical: "https://www.qwikly.co.za/trust/hosting" },
  openGraph: {
    title: "Hosting and Data Residency at Qwikly",
    description:
      "South African data residency for lead records and conversation transcripts. Edge delivery for the marketing site, in-region storage for everything that contains personal information.",
    url: "https://www.qwikly.co.za/trust/hosting",
  },
};

export default function HostingPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-4">
            <Link href="/trust" className="hover:text-ember transition-colors">
              Trust
            </Link>{" "}
            / Hosting
          </p>
          <h1 className="font-display font-medium text-[clamp(2.25rem,4.5vw,3.5rem)] leading-tight tracking-tight text-ink mb-6">
            Where your data lives,{" "}
            <em className="italic font-light">and who runs it.</em>
          </h1>
          <p className="text-ink-700 leading-relaxed text-lg max-w-2xl">
            South African businesses have legitimate reasons to want their customer data to stay
            in South Africa. So Qwikly is set up so that anything containing personal information
            is processed and stored in-region.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-12">
          <div>
            <p className="eyebrow text-ember mb-3">01</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              What lives where
            </h2>
            <ul className="space-y-3 text-ink-700 leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-ember mt-1.5">•</span>
                <span>
                  <strong className="text-ink">Lead records and conversation transcripts:</strong>{" "}
                  stored in a South African region. These are the records that contain personal
                  information.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-ember mt-1.5">•</span>
                <span>
                  <strong className="text-ink">Account, billing, and usage metadata:</strong>{" "}
                  stored in a South African region.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-ember mt-1.5">•</span>
                <span>
                  <strong className="text-ink">Marketing site (qwikly.co.za):</strong> served from
                  a global edge network for fast first-paint. The marketing pages do not contain
                  any visitor or lead personal information.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-ember mt-1.5">•</span>
                <span>
                  <strong className="text-ink">Language model inference:</strong> calls are routed
                  to the closest available region for the given model. Prompts contain only the
                  conversation context required for the next reply, not your full lead history.
                </span>
              </li>
            </ul>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">02</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Backups and durability
            </h2>
            <p className="text-ink-700 leading-relaxed">
              Lead and account data is backed up automatically with point-in-time recovery. We
              keep a rolling 30-day window of incremental snapshots. Backups inherit the same
              residency as primary storage.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">03</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              No transfer outside the Republic for routine processing
            </h2>
            <p className="text-ink-700 leading-relaxed">
              We do not move personal information outside South Africa for routine processing or
              analytics. If a specific feature ever requires cross-border processing, we will
              tell you in advance, document the lawful basis, and give you the option to opt out.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">04</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Uptime
            </h2>
            <p className="text-ink-700 leading-relaxed">
              The chat widget and lead capture pipeline run on infrastructure with multi-AZ
              failover. We publish current status, recent incidents, and ongoing maintenance at{" "}
              <Link href="/status" className="text-ember underline">
                qwikly.co.za/status
              </Link>
              .
            </p>
          </div>

          <div className="rule" />

          <div className="text-sm text-ink-500">
            Have a residency or vendor risk question? Email{" "}
            <a href="mailto:hello@qwikly.co.za" className="text-ember underline">
              hello@qwikly.co.za
            </a>{" "}
            and we will reply within one business day.
          </div>
        </div>
      </section>
    </div>
  );
}
