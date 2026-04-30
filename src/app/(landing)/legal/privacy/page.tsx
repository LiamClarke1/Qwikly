import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Qwikly. How we collect, use, and protect your data under POPIA and GDPR.",
};

export default function PrivacyPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <p className="eyebrow text-ink-500 mb-6">Legal</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-ink-500 mb-2">
            Last updated: 27 April 2026
          </p>
          <p className="text-sm text-ink-500 mb-16">
            Governing law: Republic of South Africa &middot; POPIA + GDPR-aligned
          </p>

          <div className="space-y-14">
            {/* Intro */}
            <div className="bg-paper-deep border border-ink/[0.07] rounded-2xl p-6">
              <p className="text-ink-700 leading-relaxed text-base">
                At Qwikly (operated by Clarke Agency, Johannesburg), we believe your data is your business.
                This policy explains what information we collect, why we collect it, who we share it with,
                and what rights you have. It applies to everyone who uses Qwikly, including business owners
                and their customers whose information passes through the platform.
              </p>
            </div>

            <div className="rule" />

            {/* 1. Who we are */}
            <div>
              <p className="eyebrow text-ember mb-3">01</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Who We Are
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Qwikly is operated by Clarke Agency, a business based in Johannesburg, South Africa.
                  For the purposes of the Protection of Personal Information Act 4 of 2013 (&ldquo;POPIA&rdquo;),
                  Clarke Agency acts as the <em>responsible party</em> for information collected from
                  business owners who sign up to Qwikly.
                </p>
                <p>
                  For personal information processed about end customers (the contacts of businesses using
                  Qwikly), Clarke Agency acts as an <em>operator</em> on behalf of the business owner,
                  who is the responsible party for that data.
                </p>
                <p>
                  Contact for all data-related enquiries:{" "}
                  <a
                    href="mailto:liamclarke21@outlook.com"
                    className="text-ember underline transition-colors"
                  >
                    liamclarke21@outlook.com
                  </a>
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 2. What we collect */}
            <div>
              <p className="eyebrow text-ember mb-3">02</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                What Data We Collect
              </h2>
              <div className="space-y-6 text-ink-700 leading-relaxed text-base">
                <div>
                  <h3 className="font-display font-medium text-lg text-ink mb-3">Business Account Information</h3>
                  <ul className="space-y-2 ml-4">
                    {[
                      "Name, business name, and contact details provided on signup",
                      "Email address used to create and manage your account",
                      "Business category, services offered, and pricing information",
                      "WhatsApp number and communication settings",
                      "Billing information (invoicing details, payment records)",
                    ].map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-relaxed">
                        <span className="text-ember mt-0.5 shrink-0">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-display font-medium text-lg text-ink mb-3">Customer Data (Processed on Your Behalf)</h3>
                  <ul className="space-y-2 ml-4">
                    {[
                      "Customer WhatsApp phone numbers and display names",
                      "Inbound and outbound WhatsApp and email message content",
                      "Booking details: service requested, date, time, job location if provided",
                      "Lead status and follow-up history",
                      "Customer responses to qualification questions configured by the business owner",
                    ].map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-relaxed">
                        <span className="text-ember mt-0.5 shrink-0">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h3 className="font-display font-medium text-lg text-ink mb-3">Usage &amp; Technical Data</h3>
                  <ul className="space-y-2 ml-4">
                    {[
                      "Log data: IP address, browser type, pages visited, timestamps",
                      "Device and browser information",
                      "Platform usage patterns and feature interactions",
                      "Error and diagnostic data to maintain service reliability",
                    ].map((item) => (
                      <li key={item} className="flex gap-3 text-sm leading-relaxed">
                        <span className="text-ember mt-0.5 shrink-0">·</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <div className="rule" />

            {/* 3. How we use data */}
            <div>
              <p className="eyebrow text-ember mb-3">03</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                How We Use Your Data
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>We process personal information for the following purposes:</p>
                <ul className="space-y-2 ml-4">
                  {[
                    "Delivering the Service: generating automated WhatsApp responses and managing bookings on behalf of business owners",
                    "AI response generation: customer message content is passed to Claude (Anthropic) to generate contextually appropriate replies. No customer data is retained by Anthropic for training purposes beyond the session",
                    "Booking management: creating, updating, and tracking bookings and lead status in the Qwikly dashboard",
                    "Follow-up automation: sending scheduled follow-up messages based on booking stage or lead status",
                    "Invoicing and billing: calculating commission fees and issuing invoices to business owners",
                    "Service improvement: analysing usage patterns in aggregate to improve platform performance",
                    "Communications: sending service-related notifications and, where consented, product updates",
                    "Legal compliance: meeting our obligations under POPIA, ECTA, and other applicable laws",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  We process personal information only where we have a lawful basis to do so under POPIA,
                  being either performance of a contract, compliance with a legal obligation, legitimate
                  interest, or consent.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 4. Who we share data with */}
            <div>
              <p className="eyebrow text-ember mb-3">04</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Who We Share Data With
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  We do not sell personal information. We share data only with the third-party providers
                  necessary to operate the Service:
                </p>

                <div className="space-y-5 mt-2">
                  {[
                    {
                      name: "Twilio Inc.",
                      role: "Messaging delivery",
                      detail:
                        "Processes WhatsApp and SMS messages on our behalf. Twilio acts as a sub-processor. Data is subject to Twilio's data processing terms and is processed in accordance with their privacy commitments.",
                      link: "https://www.twilio.com/en-us/legal/privacy",
                    },
                    {
                      name: "Anthropic, PBC (Claude)",
                      role: "AI response generation",
                      detail:
                        "Customer message content is passed to Claude to generate automated replies. Anthropic processes this data under its API usage policy. No data is used to train Anthropic's models by default under enterprise API terms.",
                      link: "https://www.anthropic.com/legal/privacy",
                    },
                    {
                      name: "Supabase Inc.",
                      role: "Database and authentication",
                      detail:
                        "Stores all platform data including business account information, customer records, and booking data. Supabase is SOC 2 Type II certified and stores data in AWS data centres.",
                      link: "https://supabase.com/privacy",
                    },
                  ].map((p) => (
                    <div
                      key={p.name}
                      className="border border-ink/[0.07] rounded-xl p-5"
                    >
                      <div className="flex items-baseline gap-3 mb-2">
                        <p className="font-display font-medium text-ink text-base">
                          {p.name}
                        </p>
                        <p className="eyebrow text-ink-500">{p.role}</p>
                      </div>
                      <p className="text-sm text-ink-700 leading-relaxed">
                        {p.detail}
                      </p>
                    </div>
                  ))}
                </div>

                <p>
                  We may also disclose personal information where required by law, court order, or to
                  protect the rights, property, or safety of Qwikly, its users, or the public.
                </p>
                <p>
                  In the event of a business acquisition or merger, personal information may be transferred
                  to the acquiring entity, subject to equivalent privacy protections.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 5. Data Retention */}
            <div>
              <p className="eyebrow text-ember mb-3">05</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Data Retention
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>We retain personal information only for as long as necessary for the purposes described:</p>
                <ul className="space-y-2 ml-4">
                  {[
                    "Business account data: retained for the duration of the account, plus 90 days after termination, then deleted",
                    "Customer conversation data and booking records: retained for 12 months from the date of last interaction, then deleted",
                    "Billing records and invoices: retained for 5 years as required by South African tax law",
                    "Technical and log data: retained for 90 days for diagnostic purposes",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  You may request deletion of your account and associated data at any time. We will honour
                  deletion requests within 30 days, except where retention is required by law.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 6. Your Rights */}
            <div>
              <p className="eyebrow text-ember mb-3">06</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Your Rights Under POPIA
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Under the Protection of Personal Information Act 4 of 2013, you have the following
                  rights with respect to your personal information:
                </p>
                <ul className="space-y-2 ml-4">
                  {[
                    "Right to access: request a copy of the personal information we hold about you",
                    "Right to correction: request that we correct inaccurate or incomplete information",
                    "Right to deletion: request erasure of your personal information where it is no longer necessary for the purpose collected",
                    "Right to object: object to processing based on legitimate interest",
                    "Right to restrict processing: request that we limit how we use your data in certain circumstances",
                    "Right to data portability: receive your data in a machine-readable format where technically feasible",
                    "Right to lodge a complaint: if you believe your rights have been violated, you may lodge a complaint with the Information Regulator of South Africa at inforeg.org.za",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  To exercise any of these rights, contact us at{" "}
                  <a
                    href="mailto:liamclarke21@outlook.com"
                    className="text-ember underline transition-colors"
                  >
                    liamclarke21@outlook.com
                  </a>
                  . We will respond within 30 days.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 7. GDPR */}
            <div>
              <p className="eyebrow text-ember mb-3">07</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Additional Rights for EU Residents (GDPR)
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  If you are located in the European Economic Area, you have additional rights under the
                  General Data Protection Regulation (&ldquo;GDPR&rdquo;). Our lawful basis for processing EU personal
                  data includes: contract performance, compliance with legal obligations, legitimate interests,
                  and where required, explicit consent.
                </p>
                <p>
                  Cross-border data transfers: Personal data may be transferred to and processed in countries
                  outside the EEA (including South Africa and the United States, where our sub-processors
                  are based). We ensure such transfers are covered by appropriate safeguards, including
                  Standard Contractual Clauses where required.
                </p>
                <p>
                  EU data subjects may exercise their rights as described in Section 6 and may lodge a
                  complaint with the relevant EU supervisory authority in their country of residence.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 8. Cookies */}
            <div>
              <p className="eyebrow text-ember mb-3">08</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Cookies
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Qwikly uses cookies and similar technologies to maintain authenticated sessions and
                  ensure the platform functions correctly. We do not currently use third-party advertising
                  or tracking cookies.
                </p>
                <ul className="space-y-2 ml-4">
                  {[
                    "Session cookies: required for authentication; deleted when you close your browser",
                    "Persistent authentication cookies: allow you to remain logged in across sessions",
                    "No analytics cookies are currently in use on this platform",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  You can disable cookies in your browser settings, but doing so will prevent you from
                  logging into the platform.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 9. Security */}
            <div>
              <p className="eyebrow text-ember mb-3">09</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Security
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  We implement reasonable technical and organisational measures to protect personal
                  information against unauthorised access, disclosure, alteration, or destruction. These
                  include encrypted data transmission (TLS), access controls, and use of SOC 2 certified
                  sub-processors.
                </p>
                <p>
                  No system is completely secure. If you believe your account or data has been compromised,
                  contact us immediately at{" "}
                  <a
                    href="mailto:liamclarke21@outlook.com"
                    className="text-ember underline transition-colors"
                  >
                    liamclarke21@outlook.com
                  </a>
                  .
                </p>
                <p>
                  In the event of a data breach that poses a risk to your rights, we will notify the
                  Information Regulator and affected parties as required under POPIA within 72 hours of
                  becoming aware of the breach.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 10. Children */}
            <div>
              <p className="eyebrow text-ember mb-3">10</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Children&rsquo;s Privacy
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Qwikly is not directed at persons under the age of 18. We do not knowingly collect
                  personal information from minors. If we become aware that personal information has been
                  provided by or about a minor, we will delete it promptly.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 11. Changes */}
            <div>
              <p className="eyebrow text-ember mb-3">11</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Changes to This Policy
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  We may update this Privacy Policy from time to time. We will notify you of material
                  changes by email before they take effect. The &ldquo;Last updated&rdquo; date at the top of this
                  page reflects the most recent revision. Continued use of the Service after the effective
                  date of any changes constitutes acceptance of the revised policy.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 12. Contact */}
            <div>
              <p className="eyebrow text-ember mb-3">12</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Contact &amp; Data Requests
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  For all privacy-related enquiries, data access requests, or complaints, contact us:
                </p>
                <div className="ed-card mt-4 space-y-3">
                  <p className="text-sm">
                    <span className="eyebrow text-ink-500 mr-3">Business</span>
                    Clarke Agency
                  </p>
                  <p className="text-sm">
                    <span className="eyebrow text-ink-500 mr-3">Location</span>
                    Johannesburg, South Africa
                  </p>
                  <p className="text-sm">
                    <span className="eyebrow text-ink-500 mr-3">Email</span>
                    <a
                      href="mailto:liamclarke21@outlook.com"
                      className="text-ember underline transition-colors"
                    >
                      liamclarke21@outlook.com
                    </a>
                  </p>
                  <p className="text-sm">
                    <span className="eyebrow text-ink-500 mr-3">Also</span>
                    <a
                      href="mailto:hello@qwikly.co.za"
                      className="text-ember underline transition-colors"
                    >
                      hello@qwikly.co.za
                    </a>
                  </p>
                </div>
                <p className="text-sm text-ink-500 pt-2">
                  You may also lodge a complaint with the Information Regulator of South Africa at{" "}
                  <span className="text-ink-700">inforeg.org.za</span>.
                </p>
                <p className="text-sm text-ink-500">
                  Also see our{" "}
                  <Link href="/legal/terms" className="text-ember underline transition-colors">
                    Terms of Service
                  </Link>
                  .
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
