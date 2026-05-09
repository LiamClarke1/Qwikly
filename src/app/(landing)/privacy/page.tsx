import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Qwikly handles personal information, in line with the Protection of Personal Information Act (POPIA, 2013). Plain English, no legalese.",
};

const collection = [
  {
    label: "Business owners (when you sign up)",
    items: [
      "Your name, business name, and the email you sign up with",
      "Your WhatsApp number, services, and pricing settings",
      "Billing details for your subscription",
    ],
  },
  {
    label: "Visitors to your website (people who chat with the digital assistant)",
    items: [
      "Name, phone number, and email address if they share them",
      "The conversation they have with the digital assistant",
      "Documents or photos they choose to attach in chat",
      "Booking details: service requested, date, time, and area",
    ],
  },
  {
    label: "Technical data, collected automatically",
    items: [
      "IP address, browser type, and pages visited",
      "Session and authentication cookies so logins keep working",
      "Error logs we use to diagnose problems",
    ],
  },
];

const usage = [
  "Run the digital assistant and answer your visitors on your behalf",
  "Capture leads, qualify them, and book them in",
  "Send booking confirmations and follow-up messages",
  "Bill you for your subscription and issue invoices",
  "Improve the service in aggregate, never for advertising",
  "Meet our legal duties under POPIA, ECTA, and South African tax law",
];

const sharedWith = [
  {
    name: "Supabase",
    role: "Database and authentication",
    detail:
      "Stores account data and conversations. SOC 2 Type II certified. Hosted on AWS infrastructure in the eu-west-1 region.",
    link: "https://supabase.com/privacy",
  },
  {
    name: "Twilio",
    role: "WhatsApp and SMS delivery",
    detail:
      "Delivers WhatsApp and SMS messages on our behalf. Acts as an operator under POPIA and follows the Twilio Trust Center commitments.",
    link: "https://www.twilio.com/en-us/legal/privacy",
  },
  {
    name: "Anthropic",
    role: "Reply generation for the digital assistant",
    detail:
      "We pass each visitor message to Anthropic so the digital assistant can write a reply. Anthropic does not retain message content for training under our enterprise terms.",
    link: "https://www.anthropic.com/legal/privacy",
  },
  {
    name: "Resend",
    role: "Transactional email delivery",
    detail:
      "Sends booking confirmations, lead notifications, and account emails. Operator under POPIA.",
    link: "https://resend.com/legal/privacy-policy",
  },
  {
    name: "Paystack",
    role: "Subscription payments",
    detail:
      "Processes subscription payments. Stores billing details directly, we never see card numbers.",
    link: "https://paystack.com/privacy",
  },
];

const retention = [
  "Business account information, kept for as long as your account is active, then for 90 days after closure, then deleted",
  "Visitor conversations and messages, kept for 24 months from the last message, then deleted automatically",
  "Documents shared in chat, kept for 12 months, then deleted automatically",
  "Tax and billing records, kept for 5 years as required by South African tax law",
  "Diagnostic logs, kept for 90 days",
];

const rights = [
  {
    title: "Access",
    body: "You can ask for a copy of the personal information we hold about you.",
  },
  {
    title: "Correction",
    body: "You can ask us to fix anything that is wrong or incomplete.",
  },
  {
    title: "Deletion",
    body: "You can ask us to delete your information. The fastest way is the form linked at the bottom of this page.",
  },
  {
    title: "Objection",
    body: "You can object to processing that relies on our legitimate interest, including marketing.",
  },
  {
    title: "Complain",
    body: "If you think we have mishandled your information, you can complain to the Information Regulator of South Africa at inforegulator.org.za.",
  },
];

export default function PrivacyPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">Legal</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-4">
            Privacy Policy
          </h1>
          <p className="text-sm text-ink-500 mb-2">
            Last updated: 9 May 2026
          </p>
          <p className="text-sm text-ink-500 mb-16">
            In line with the Protection of Personal Information Act (POPIA, 2013), Republic of South Africa
          </p>

          <div className="space-y-14">
            <div className="bg-paper-deep border border-ink/[0.07] rounded-2xl p-6">
              <p className="text-ink-700 leading-relaxed text-base">
                Qwikly is built and run by Clarke Agency in Cape Town. This page explains, in plain English,
                what information we collect, why we collect it, who we share it with, how long we keep it,
                and what you can do about it. If anything here is unclear, email us at{" "}
                <a href="mailto:hello@qwikly.co.za" className="text-ember underline transition-colors">
                  hello@qwikly.co.za
                </a>
                .
              </p>
            </div>

            <div className="rule" />

            <Section number="01" title="Who we are">
              <p>
                Qwikly is a product of Clarke Agency, a business in Cape Town, South Africa.
                For information about business owners who sign up to Qwikly, Clarke Agency is the
                responsible party under POPIA.
              </p>
              <p>
                For information about end visitors who chat with a Qwikly digital assistant on a
                client website, the client business is the responsible party. Clarke Agency acts
                as an operator on the client&rsquo;s behalf.
              </p>
              <p>
                Our Information Officer can be reached at{" "}
                <a href="mailto:hello@qwikly.co.za" className="text-ember underline transition-colors">
                  hello@qwikly.co.za
                </a>
                . Address all data and privacy enquiries to that mailbox.
              </p>
            </Section>

            <div className="rule" />

            <Section number="02" title="What we collect">
              <p>
                We try to collect as little as we need to run the service well. The data falls into three groups.
              </p>
              {collection.map((group) => (
                <div key={group.label} className="mt-4">
                  <h3 className="font-display font-medium text-lg text-ink mb-3">{group.label}</h3>
                  <BulletList items={group.items} />
                </div>
              ))}
            </Section>

            <div className="rule" />

            <Section number="03" title="Why we use it">
              <p>We use this information to:</p>
              <BulletList items={usage} />
              <p>
                We do not sell personal information. We do not use it for advertising. The only reason
                we hold it is to run Qwikly.
              </p>
            </Section>

            <div className="rule" />

            <Section number="04" title="Who can access it">
              <p>
                The Clarke Agency team can access account and visitor data on a need-to-know basis to run,
                support, and bill the service. Beyond that, only the third-party operators below ever see it.
                Each one is bound by a written agreement with us.
              </p>
              <div className="space-y-5 mt-4">
                {sharedWith.map((p) => (
                  <div key={p.name} className="border border-ink/[0.07] rounded-xl p-5">
                    <div className="flex items-baseline gap-3 mb-2">
                      <p className="font-display font-medium text-ink text-base">{p.name}</p>
                      <p className="eyebrow text-ink-500">{p.role}</p>
                    </div>
                    <p className="text-sm text-ink-700 leading-relaxed">{p.detail}</p>
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-xs text-ember underline transition-colors"
                    >
                      Privacy notice
                    </a>
                  </div>
                ))}
              </div>
            </Section>

            <div className="rule" />

            <Section number="05" title="How long we keep it">
              <p>We hold personal information only for as long as we have a real reason to:</p>
              <BulletList items={retention} />
              <p>
                You can ask us to delete your information at any time using the form linked below.
                We honour deletion requests within 30 days, except where we are legally required to keep
                records (for example, tax invoices).
              </p>
            </Section>

            <div className="rule" />

            <Section number="06" title="Your rights under POPIA">
              <p>
                POPIA gives you specific rights over personal information that relates to you. You can use
                any of them, free of charge, by emailing{" "}
                <a href="mailto:hello@qwikly.co.za" className="text-ember underline transition-colors">
                  hello@qwikly.co.za
                </a>{" "}
                or, for deletion, the form linked below.
              </p>
              <div className="space-y-4 mt-4">
                {rights.map((r) => (
                  <div key={r.title}>
                    <p className="font-display font-medium text-ink text-base mb-1">
                      Right to {r.title.toLowerCase()}
                    </p>
                    <p className="text-sm text-ink-700 leading-relaxed">{r.body}</p>
                  </div>
                ))}
              </div>
              <p className="text-sm text-ink-700 mt-6">
                We will respond within 30 days. If we cannot help, we will explain why.
              </p>
            </Section>

            <div className="rule" />

            <Section number="07" title="Where data lives">
              <p>
                Qwikly account and visitor data is stored on Supabase&rsquo;s eu-west-1 (Ireland) region.
                Some operators we work with, such as Anthropic and Resend, are based in the United States,
                so processing them happens there. Each transfer is covered by Standard Contractual Clauses
                or equivalent safeguards required under POPIA section 72.
              </p>
            </Section>

            <div className="rule" />

            <Section number="08" title="Cookies">
              <p>
                Qwikly uses two kinds of cookies. We do not use any third-party advertising cookies.
              </p>
              <BulletList
                items={[
                  "Session and authentication cookies, so you stay logged in to the dashboard",
                  "A consent cookie, so we remember your choice from the cookie banner and don&rsquo;t pester you",
                ]}
              />
              <p>
                You can clear or block these in your browser settings. If you block the auth cookies you
                will not be able to log in.
              </p>
            </Section>

            <div className="rule" />

            <Section number="09" title="Security">
              <p>
                Data in transit is encrypted with TLS. Data at rest is encrypted by Supabase. Access to the
                production database is limited to the Clarke Agency team and protected by SSO and 2FA.
                We do not store payment card data ourselves; that is handled by Paystack.
              </p>
              <p>
                If you believe your account or data has been compromised, email{" "}
                <a href="mailto:hello@qwikly.co.za" className="text-ember underline transition-colors">
                  hello@qwikly.co.za
                </a>{" "}
                immediately. If a breach is likely to harm you, we will notify you and the Information
                Regulator within 72 hours of becoming aware of it, as POPIA requires.
              </p>
            </Section>

            <div className="rule" />

            <Section number="10" title="Children">
              <p>
                Qwikly is not for people under 18. We do not knowingly collect personal information from
                minors. If you think a minor has shared information with us, email us and we will delete it.
              </p>
            </Section>

            <div className="rule" />

            <Section number="11" title="Changes to this policy">
              <p>
                If we make material changes, we will email account holders before the change takes effect.
                The &ldquo;Last updated&rdquo; date at the top of this page always reflects the latest version.
              </p>
            </Section>

            <div className="rule" />

            <Section number="12" title="Contact and requests">
              <div className="ed-card mt-2 space-y-3">
                <p className="text-sm">
                  <span className="eyebrow text-ink-500 mr-3">Information Officer</span>
                  Liam Clarke, Clarke Agency
                </p>
                <p className="text-sm">
                  <span className="eyebrow text-ink-500 mr-3">Email</span>
                  <a href="mailto:hello@qwikly.co.za" className="text-ember underline transition-colors">
                    hello@qwikly.co.za
                  </a>
                </p>
                <p className="text-sm">
                  <span className="eyebrow text-ink-500 mr-3">Location</span>
                  Cape Town, South Africa
                </p>
              </div>

              <div className="mt-6 p-5 border border-ember/30 bg-ember/[0.03] rounded-xl">
                <p className="font-display font-medium text-ink text-base mb-2">
                  Want your data deleted?
                </p>
                <p className="text-sm text-ink-700 leading-relaxed mb-4">
                  Use the form below. Enter the email or phone you used to chat with a Qwikly assistant
                  and we will email you a link to confirm. Once confirmed, we soft-delete your conversations
                  immediately and remove them entirely on the next daily retention run.
                </p>
                <Link
                  href="/privacy/delete-my-data"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ink text-paper text-sm font-semibold hover:bg-ink/90 transition-colors cursor-pointer"
                >
                  Request data deletion
                </Link>
              </div>

              <p className="text-sm text-ink-500 mt-6">
                You can also lodge a complaint directly with the Information Regulator of South Africa at{" "}
                <a
                  href="https://inforegulator.org.za"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-ember underline transition-colors"
                >
                  inforegulator.org.za
                </a>
                .
              </p>
              <p className="text-sm text-ink-500 mt-2">
                See also our{" "}
                <Link href="/legal/terms" className="text-ember underline transition-colors">
                  Terms of Service
                </Link>
                .
              </p>
            </Section>
          </div>
        </div>
      </section>
    </div>
  );
}

function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="eyebrow text-ember mb-3">{number}</p>
      <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">{title}</h2>
      <div className="space-y-4 text-ink-700 leading-relaxed text-base">{children}</div>
    </div>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 ml-4">
      {items.map((item) => (
        <li key={item} className="flex gap-3 text-sm leading-relaxed">
          <span className="text-ember mt-0.5 shrink-0">·</span>
          <span dangerouslySetInnerHTML={{ __html: item }} />
        </li>
      ))}
    </ul>
  );
}
