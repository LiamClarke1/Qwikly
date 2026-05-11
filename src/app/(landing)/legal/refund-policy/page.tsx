import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Refund Policy",
  description:
    "Refund and cancellation policy for Qwikly subscriptions and AI credit packs. Governed by South African consumer law.",
};

export default function RefundPolicyPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">Legal</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-4">
            Refund Policy
          </h1>
          <p className="text-sm text-ink-500 mb-2">Last updated: 11 May 2026</p>
          <p className="text-sm text-ink-500 mb-16">
            Governing law: Republic of South Africa &mdash; Consumer Protection Act 68 of 2008
          </p>

          <div className="space-y-14">

            {/* 01 */}
            <div>
              <p className="eyebrow text-ember mb-3">01</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Overview
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Qwikly offers a 7-day free trial so you can experience the full platform before
                  committing to a paid plan. Because of this, all subscription fees are
                  non-refundable once charged. This policy sets out the limited circumstances in
                  which a refund may be considered, your rights under the Consumer Protection Act
                  68 of 2008 (&ldquo;CPA&rdquo;), and how to contact us if you believe you have a valid claim.
                </p>
                <p>
                  By subscribing to Qwikly you acknowledge that you have read and understood this
                  policy. It forms part of the{" "}
                  <Link href="/legal/terms" className="text-ember underline transition-colors">
                    Terms of Service
                  </Link>
                  .
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 02 */}
            <div>
              <p className="eyebrow text-ember mb-3">02</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Free Trial
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  All new accounts begin with a 7-day free trial. No payment method is required
                  to start, and no charge is made until you actively choose a paid plan. The trial
                  gives you full access to all features so you can evaluate Qwikly before spending
                  any money.
                </p>
                <p>
                  Because no payment is taken during the trial period, no refund is applicable if
                  you decide not to continue after the trial ends.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 03 */}
            <div>
              <p className="eyebrow text-ember mb-3">03</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Monthly Subscriptions
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Subscription fees are billed monthly in advance on your billing date. Once a
                  billing cycle has been charged, that payment is non-refundable, including in the
                  following situations:
                </p>
                <ul className="space-y-2 mt-2 ml-4">
                  {[
                    "You cancel mid-cycle — you retain access until the end of the paid period",
                    "You did not use the Service during a billing period",
                    "You forgot to cancel before the renewal date",
                    "You downgrade to a lower plan — the downgrade takes effect next cycle",
                    "Your leads or conversations were fewer than your plan's monthly cap",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  When you cancel, your subscription remains active until the last day of the
                  period you have already paid for. You will not be billed again.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 04 */}
            <div>
              <p className="eyebrow text-ember mb-3">04</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Annual Subscriptions
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Annual plans are billed upfront for 12 months at a 15% discount. Annual fees
                  are non-refundable in full. If you cancel an annual plan early:
                </p>
                <ul className="space-y-2 mt-2 ml-4">
                  {[
                    "You retain access for the remainder of the annual period",
                    "No pro-rata refund is issued for unused months",
                    "The discount applied at purchase is not reversed",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  As an exception, if Qwikly permanently discontinues the Service during your paid
                  annual period, a pro-rata refund will be issued for the unused portion of your
                  subscription.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 05 */}
            <div>
              <p className="eyebrow text-ember mb-3">05</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                AI Credit Top-Up Packs
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  AI conversation credit packs (Small, Medium, Large) are one-time purchases that
                  add credit to your wallet. Purchased credit never expires. Top-up purchases are
                  non-refundable once the payment has been processed, as credit is made available
                  in your account immediately.
                </p>
                <p>
                  If credit was added to your account in error due to a technical fault on our
                  side, contact us within 7 days at{" "}
                  <a href="mailto:hello@qwikly.co.za" className="text-ember underline transition-colors">
                    hello@qwikly.co.za
                  </a>{" "}
                  and we will investigate and resolve the issue.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 06 */}
            <div>
              <p className="eyebrow text-ember mb-3">06</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                When a Refund May Be Considered
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  While our standard policy is no refunds, we will review requests in the
                  following exceptional circumstances:
                </p>
                <ul className="space-y-2 mt-2 ml-4">
                  {[
                    "You were charged twice for the same billing period due to a system error",
                    "Your account was charged after a confirmed cancellation was in place",
                    "A material failure of the Service prevented any use for 7 or more consecutive days during a paid billing period, and Qwikly was notified but failed to resolve it",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  Refund requests must be submitted within 30 days of the charge in question.
                  We will respond to all requests within 5 business days. Approved refunds are
                  processed back to the original payment method and may take 5 to 10 business
                  days to appear.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 07 */}
            <div>
              <p className="eyebrow text-ember mb-3">07</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Your Rights Under the Consumer Protection Act
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Nothing in this policy limits or overrides your rights under the Consumer
                  Protection Act 68 of 2008 (&ldquo;CPA&rdquo;). In particular:
                </p>
                <ul className="space-y-2 mt-2 ml-4">
                  {[
                    "Section 16 of the CPA gives you the right to cancel a fixed-term agreement with 20 business days' written notice. Qwikly's monthly subscriptions are not fixed-term contracts, and you may cancel at any time from your dashboard.",
                    "Section 17 of the CPA entitles you to cancel a fixed-term agreement at any time, subject to a reasonable cancellation penalty not exceeding 3 months of the remaining subscription value. Where applicable, Qwikly will not charge a penalty exceeding one month's subscription fee.",
                    "If you entered into your subscription as a result of direct marketing (unsolicited), you have a 5-business-day cooling-off period under Section 16 of the CPA in which you may cancel and receive a full refund.",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  If you believe your CPA rights have not been respected, you may contact the
                  National Consumer Commission at{" "}
                  <a
                    href="https://www.thencc.gov.za"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-ember underline transition-colors"
                  >
                    www.thencc.gov.za
                  </a>
                  .
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 08 */}
            <div>
              <p className="eyebrow text-ember mb-3">08</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                How to Request a Refund
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  To submit a refund request, email{" "}
                  <a href="mailto:hello@qwikly.co.za" className="text-ember underline transition-colors">
                    hello@qwikly.co.za
                  </a>{" "}
                  with the subject line <strong className="text-ink font-medium">Refund Request</strong> and include:
                </p>
                <ul className="space-y-2 mt-2 ml-4">
                  {[
                    "Your account email address",
                    "The date and amount of the charge",
                    "The reason for your request",
                    "Any relevant screenshots or order references",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  We aim to respond within 5 business days. Where a refund is approved, it will
                  be processed within 10 business days of our confirmation email.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 09 */}
            <div>
              <p className="eyebrow text-ember mb-3">09</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Changes to This Policy
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  We may update this policy from time to time. Material changes will be
                  communicated by email at least 14 days before they take effect. The
                  &ldquo;Last updated&rdquo; date at the top of this page reflects the most recent revision.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 10 — Contact */}
            <div>
              <p className="eyebrow text-ember mb-3">10</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Contact
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>Questions about this policy? Reach us at:</p>
                <div className="ed-card mt-4 space-y-3">
                  <p className="text-sm">
                    <span className="eyebrow text-ink-500 mr-3">Business</span>
                    Clarke Agency
                  </p>
                  <p className="text-sm">
                    <span className="eyebrow text-ink-500 mr-3">Location</span>
                    Cape Town, South Africa
                  </p>
                  <p className="text-sm">
                    <span className="eyebrow text-ink-500 mr-3">Email</span>
                    <a
                      href="mailto:hello@qwikly.co.za"
                      className="text-ember underline transition-colors"
                    >
                      hello@qwikly.co.za
                    </a>
                  </p>
                </div>
                <p className="text-sm text-ink-500 pt-4">
                  Also see our{" "}
                  <Link href="/legal/terms" className="text-ember underline transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-ember underline transition-colors">
                    Privacy Policy
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
