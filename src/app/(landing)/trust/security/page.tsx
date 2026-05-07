import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Security",
  description:
    "How Qwikly secures your data: TLS in transit, encryption at rest, scoped access, audit logs, content security policy, tenant isolation.",
  alternates: { canonical: "https://www.qwikly.co.za/trust/security" },
  openGraph: {
    title: "Security at Qwikly",
    description:
      "Encryption in transit and at rest, scoped tokens, hardened content security policy, and tenant isolation. The defaults that keep your customers' data safe.",
    url: "https://www.qwikly.co.za/trust/security",
  },
};

export default function SecurityPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-12 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-4">
            <Link href="/trust" className="hover:text-ember transition-colors">
              Trust
            </Link>{" "}
            / Security
          </p>
          <h1 className="font-display font-medium text-[clamp(2.25rem,4.5vw,3.5rem)] leading-tight tracking-tight text-ink mb-6">
            Security defaults,{" "}
            <em className="italic font-light">that you do not have to think about.</em>
          </h1>
          <p className="text-ink-700 leading-relaxed text-lg max-w-2xl">
            Most small businesses do not have a security team. Qwikly is built on the assumption
            that we are yours. Here are the defaults you get from day one.
          </p>
        </div>
      </section>

      <section className="pb-24 px-6">
        <div className="max-w-3xl mx-auto space-y-12">
          <div>
            <p className="eyebrow text-ember mb-3">01</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Encryption in transit and at rest
            </h2>
            <p className="text-ink-700 leading-relaxed">
              Every request between a visitor, the chat widget, and Qwikly is sent over TLS 1.2
              or higher. Lead records, conversation transcripts, and account metadata are
              encrypted at rest using AES-256.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">02</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Tenant isolation
            </h2>
            <p className="text-ink-700 leading-relaxed">
              Every business on Qwikly is a separate tenant. Database row-level security policies
              enforce isolation at the storage layer, so application bugs cannot expose one
              tenant&rsquo;s data to another. The widget script is scoped per tenant and cannot
              read data outside its own assistant.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">03</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Authentication
            </h2>
            <p className="text-ink-700 leading-relaxed">
              Owner accounts are protected with a hashed password and email-based session cookies
              that rotate on suspicious activity. Sessions can be revoked from the dashboard at
              any time. Passwords are stored only as bcrypt hashes, never in plaintext.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">04</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Hardened headers and CSP
            </h2>
            <p className="text-ink-700 leading-relaxed">
              Every page Qwikly serves carries a strict Content Security Policy, an
              X-Content-Type-Options nosniff header, a Referrer-Policy of
              strict-origin-when-cross-origin, and a Permissions-Policy that blocks camera,
              microphone, and geolocation by default. The widget surface is the only endpoint
              intentionally allowed cross-origin loading.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">05</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Audit logs
            </h2>
            <p className="text-ink-700 leading-relaxed">
              Every administrative action on a tenant (sign in, lead deletion, plan change,
              widget reconfiguration) is recorded with a timestamp and the actor. Logs are
              retained for 90 days and available to the account owner on request.
            </p>
          </div>

          <div>
            <p className="eyebrow text-ember mb-3">06</p>
            <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
              Responsible disclosure
            </h2>
            <p className="text-ink-700 leading-relaxed">
              If you believe you have found a security issue, email{" "}
              <a href="mailto:hello@qwikly.co.za" className="text-ember underline">
                hello@qwikly.co.za
              </a>{" "}
              with a clear reproduction and we will respond within one business day. Please do
              not test against live tenants other than your own. We are happy to credit
              researchers who follow responsible disclosure.
            </p>
          </div>

          <div className="rule" />

          <div className="text-sm text-ink-500">
            Looking for a vendor questionnaire or DPA? Email{" "}
            <a href="mailto:hello@qwikly.co.za" className="text-ember underline">
              hello@qwikly.co.za
            </a>{" "}
            and we will turn it around quickly.
          </div>
        </div>
      </section>
    </div>
  );
}
