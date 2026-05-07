import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Trust",
  description:
    "How Qwikly handles your data, where it lives, and what we do to keep it safe. POPIA compliant, hosted in South Africa, SSL encrypted, no lock-in, no per-job fees.",
  alternates: { canonical: "https://www.qwikly.co.za/trust" },
  openGraph: {
    title: "Trust at Qwikly: POPIA, Hosting, Security",
    description:
      "Plain-English answers about compliance, where your data lives, and how we keep it safe. POPIA compliant, hosted in South Africa, SSL encrypted, no lock-in.",
    url: "https://www.qwikly.co.za/trust",
  },
};

const pillars = [
  {
    eyebrow: "01",
    title: "POPIA compliant",
    body: "We follow the Protection of Personal Information Act in full. Lawful basis for every record, owner-controlled access, deletion on request, and a clear breach process.",
    href: "/trust/popia",
  },
  {
    eyebrow: "02",
    title: "Hosted in South Africa",
    body: "All conversation transcripts, lead records, and account data are stored on infrastructure that processes within South Africa. Latency stays low, residency stays clear.",
    href: "/trust/hosting",
  },
  {
    eyebrow: "03",
    title: "Security by default",
    body: "TLS in transit, encryption at rest, scoped access tokens, audit trails, and a hardened content security policy. No tenant ever sees another tenant's data.",
    href: "/trust/security",
  },
];

const promises = [
  "POPIA compliant.",
  "Hosted in South Africa.",
  "SSL encrypted across the platform.",
  "No lock-in. Cancel any time from the dashboard.",
  "Flat monthly fee. No per-job fees, no commissions, ever.",
  "We never sell your data or your customers' data to third parties.",
];

export default function TrustHubPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-16 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">Trust</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-8">
            Your data, your customers,{" "}
            <em className="italic font-light">handled with care.</em>
          </h1>
          <p className="text-ink-700 leading-relaxed text-lg max-w-2xl">
            Qwikly handles real conversations with real customers. That comes with real
            responsibility. Here is, in plain English, how we look after the data your business
            and your visitors trust us with.
          </p>
        </div>
      </section>

      <section className="pb-16 px-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {pillars.map((p) => (
            <Link
              key={p.title}
              href={p.href}
              className="block bg-paper-deep border border-ink/[0.07] rounded-2xl p-7 hover:border-ember/40 transition-colors duration-200 cursor-pointer group"
            >
              <p className="eyebrow text-ember mb-3">{p.eyebrow}</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-3 tracking-tight group-hover:text-ember transition-colors">
                {p.title}
              </h2>
              <p className="text-ink-700 leading-relaxed text-base">{p.body}</p>
              <p className="mt-4 text-sm text-ember underline">Read the full detail</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="rule mb-12" />
          <p className="eyebrow text-ink-500 mb-6">Our promises</p>
          <ul className="space-y-3">
            {promises.map((line) => (
              <li key={line} className="text-ink-700 leading-relaxed text-base flex items-start gap-3">
                <span className="text-ember mt-1.5">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div className="mt-12 text-sm text-ink-500">
            Have a compliance question? Email{" "}
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
