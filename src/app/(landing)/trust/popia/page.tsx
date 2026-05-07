import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "POPIA Compliance",
  description:
    "How Qwikly meets the Protection of Personal Information Act (POPIA). Lawful basis, data minimisation, owner-controlled access, deletion on request, breach process.",
  alternates: { canonical: "https://www.qwikly.co.za/trust/popia" },
  openGraph: {
    title: "POPIA Compliance at Qwikly",
    description:
      "What POPIA requires, what Qwikly does to meet each obligation, and what your business is responsible for as the data controller.",
    url: "https://www.qwikly.co.za/trust/popia",
  },
};

export default function PopiaPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-4">
            <Link href="/trust" className="hover:text-ember transition-colors">
              Trust
            </Link>{" "}
            / POPIA
          </p>
          <h1 className="font-display font-medium text-[clamp(2.25rem,4.5vw,3.5rem)] leading-tight tracking-tight text-ink mb-6">
            POPIA compliance,{" "}
            <em className="italic font-light">in plain English.</em>
          </h1>
          <p className="text-ink-700 leading-relaxed text-lg max-w-2xl">
            Qwikly is built for South African businesses, so the Protection of Personal
            Information Act (POPIA) is treated as a baseline, not a checkbox. Here is what we do,
            and what your business is responsible for, in plain English.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-12">
          <div>
            <p className="eyebrow text-ember mb-3">01</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Lawful basis for every record
            </h2>
            <p className="text-ink-700 leading-relaxed">
              Every visitor record we store has a clear lawful basis. Most leads are based on the
              visitor&rsquo;s informed consent inside the chat (they choose to share their name,
              email, or phone number to receive a callback or quote). Where the basis is
              legitimate interest of the business, we restrict the collection to what is strictly
              needed to fulfil the enquiry.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">02</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Data minimisation by design
            </h2>
            <p className="text-ink-700 leading-relaxed">
              Qwikly only collects the contact details, qualifying answers, and conversation
              transcript needed to deliver a useful lead to your inbox. We do not collect ID
              numbers, banking details, location data, or any special-category personal
              information. The chat does not request data you have not authorised it to ask for.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">03</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Storage location and processing
            </h2>
            <p className="text-ink-700 leading-relaxed">
              All lead records and conversation transcripts are stored on infrastructure that
              processes within South Africa. We do not transfer personal information outside the
              Republic for routine processing. Read more about{" "}
              <Link href="/trust/hosting" className="text-ember underline">
                where your data lives
              </Link>
              .
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">04</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Owner control and access requests
            </h2>
            <p className="text-ink-700 leading-relaxed">
              You, the business owner, are the responsible party for the visitors who interact
              with your assistant. Qwikly is your operator. From your dashboard you can view,
              export, or delete any conversation and any lead at any time. If a customer of yours
              submits a POPIA access or deletion request, you can fulfil it from the dashboard in
              seconds.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">05</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Retention and deletion
            </h2>
            <p className="text-ink-700 leading-relaxed">
              Lead records and chat transcripts are retained for as long as the business account
              is active, or shorter if the account holder configures a custom retention window.
              Closing your Qwikly account triggers deletion of customer-identifiable data within
              30 days, except where law requires longer retention.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">06</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Sub-processors
            </h2>
            <p className="text-ink-700 leading-relaxed">
              Qwikly uses a small set of sub-processors for hosting, transactional email, and
              language model inference. Each sub-processor is bound by a written agreement that
              prohibits onward use of personal information for their own purposes. The current
              list is available on request to{" "}
              <a href="mailto:hello@qwikly.co.za" className="text-ember underline">
                hello@qwikly.co.za
              </a>
              .
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">07</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Breach process
            </h2>
            <p className="text-ink-700 leading-relaxed">
              In the event of a confirmed personal-information breach, Qwikly notifies affected
              customers and the Information Regulator within the timelines required by POPIA. Our
              standard target is notification within 72 hours of confirmation.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">08</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              What you, the business, are responsible for
            </h2>
            <ul className="space-y-3 text-ink-700 leading-relaxed">
              <li className="flex items-start gap-3">
                <span className="text-ember mt-1.5">•</span>
                <span>
                  Telling visitors, in your own privacy notice, that you use a chat assistant to
                  capture enquiries.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-ember mt-1.5">•</span>
                <span>
                  Honouring access, correction, and deletion requests from your customers within
                  the timelines POPIA requires.
                </span>
              </li>
              <li className="flex items-start gap-3">
                <span className="text-ember mt-1.5">•</span>
                <span>
                  Not asking the assistant to collect special-category personal information
                  (health, religion, biometrics, financial details).
                </span>
              </li>
            </ul>
          </div>

          <div className="rule" />

          <div className="text-sm text-ink-500">
            Compliance question? Email{" "}
            <a href="mailto:hello@qwikly.co.za" className="text-ember underline">
              hello@qwikly.co.za
            </a>
            . For the formal language, read our{" "}
            <Link href="/legal/privacy" className="text-ember underline">
              privacy policy
            </Link>
            .
          </div>
        </div>
      </section>
    </div>
  );
}
