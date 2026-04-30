import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Qwikly, the automated WhatsApp response platform for South African service businesses.",
};

export default function TermsPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <p className="eyebrow text-ink-500 mb-6">Legal</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-4">
            Terms of Service
          </h1>
          <p className="text-sm text-ink-500 mb-2">
            Last updated: 27 April 2026
          </p>
          <p className="text-sm text-ink-500 mb-16">
            Governing law: Republic of South Africa
          </p>

          <div className="space-y-14">
            {/* 1. Acceptance */}
            <div>
              <p className="eyebrow text-ember mb-3">01</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Acceptance of Terms
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  By accessing or using the Qwikly platform (the &ldquo;Service&rdquo;), you agree to be
                  bound by these Terms of Service (&ldquo;Terms&rdquo;) and all applicable South African laws
                  and regulations. If you do not agree to these Terms, you may not use the Service.
                </p>
                <p>
                  You must be at least 18 years old and legally capable of entering into binding
                  contracts under South African law to use the Service. By using Qwikly on behalf of
                  a business, you represent that you have the authority to bind that business to these Terms.
                </p>
                <p>
                  These Terms constitute the entire agreement between you and Qwikly (operated by Clarke Agency,
                  Johannesburg, South Africa) regarding your use of the Service.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 2. Service Description */}
            <div>
              <p className="eyebrow text-ember mb-3">02</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Description of Service
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Qwikly is an automated WhatsApp response and booking management platform designed for
                  South African service businesses. The Service enables businesses to respond to inbound
                  WhatsApp and email enquiries automatically, qualify leads, manage bookings, and send
                  follow-up communications, without manual intervention.
                </p>
                <p>
                  Features include, but are not limited to: 30-second WhatsApp response, automated
                  follow-up sequences, no-show rebooking, quote follow-up, dormant-lead revival, appointment
                  reminders, and a client dashboard with conversation transcripts.
                </p>
                <p>
                  Qwikly uses third-party infrastructure including Twilio (messaging delivery), Claude by
                  Anthropic (AI response generation), and Supabase (data storage). Service availability
                  is provided on a best-efforts basis. We do not guarantee 100% uptime and are not liable
                  for downtime caused by third-party service providers, force majeure, or factors outside
                  our reasonable control.
                </p>
                <p>
                  The Service is intended for use by businesses registered or operating in the Republic
                  of South Africa. Use from other jurisdictions is at the user&rsquo;s own risk and must comply
                  with all applicable local laws.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 3. User Obligations */}
            <div>
              <p className="eyebrow text-ember mb-3">03</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                User Obligations
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  You agree to provide accurate, current, and complete information when creating your
                  account and to maintain the accuracy of that information at all times. You are responsible
                  for maintaining the confidentiality of your login credentials and for all activity that
                  occurs under your account.
                </p>
                <p>You agree that you will not:</p>
                <ul className="space-y-2 mt-2 ml-4">
                  {[
                    "Use the Service for any unlawful purpose or in violation of any South African law or regulation",
                    "Use the Service to send unsolicited communications in contravention of the Electronic Communications and Transactions Act 25 of 2002 (ECTA) or the CAN-SPAM Act equivalent provisions",
                    "Upload, transmit, or distribute any content that is defamatory, obscene, fraudulent, or that infringes any third party's intellectual property rights",
                    "Attempt to gain unauthorised access to any part of the Service or its underlying infrastructure",
                    "Reverse engineer, decompile, or disassemble any part of the Service",
                    "Resell or sublicense access to the Service without our prior written consent",
                    "Use the Service to collect or harvest personal information of third parties in violation of POPIA",
                    "Impersonate any person or entity, or falsely represent your affiliation with any person or entity",
                    "Introduce malware, viruses, or any harmful code into the Service",
                    "Use the Service in a manner that could damage, disable, overburden, or impair it",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
                <p>
                  You are solely responsible for ensuring that your use of Qwikly complies with all
                  applicable laws, including the Consumer Protection Act 68 of 2008 and POPIA. You
                  must obtain all necessary consents from your customers before their contact information
                  is processed by the Service.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 4. Trial and Payment */}
            <div>
              <p className="eyebrow text-ember mb-3">04</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Trial Period &amp; Payment Terms
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <h3 className="font-display font-medium text-lg text-ink mt-2">Free Trial</h3>
                <p>
                  New accounts receive a 7-day free trial. No payment information is required to begin
                  the trial. At the end of the trial period, your account will require active use of
                  the Service to continue operating. No charges are incurred if you do not proceed past
                  the trial.
                </p>

                <h3 className="font-display font-medium text-lg text-ink mt-6">Commission Model</h3>
                <p>
                  Qwikly charges a commission of <strong className="text-ink font-medium">8% of the service price</strong> for
                  each job successfully booked through the platform. No subscription fee, setup fee, or
                  retainer is charged.
                </p>
                <ul className="space-y-2 mt-2 ml-4">
                  {[
                    "Minimum fee per booking: R150 (one hundred and fifty rand)",
                    "Maximum fee per booking: R5,000 (five thousand rand)",
                    "The fee is calculated on the service price you provide during onboarding for the specific service booked",
                    "Fees are invoiced monthly for all bookings completed in the preceding calendar month",
                    "Payment is due within 14 days of invoice date",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>

                <h3 className="font-display font-medium text-lg text-ink mt-6">Late Payment</h3>
                <p>
                  Invoices not settled within 14 days may result in suspension of your account. Persistent
                  non-payment may result in termination. We reserve the right to charge interest on overdue
                  amounts at the rate prescribed under the Prescribed Rate of Interest Act 55 of 1975.
                </p>

                <h3 className="font-display font-medium text-lg text-ink mt-6">Refunds</h3>
                <p>
                  Fees are charged only on completed bookings. We do not provide refunds on commissions
                  already earned unless a booking was demonstrably attributable to a technical error on
                  our part. Disputes must be raised within 30 days of the relevant invoice date by
                  contacting{" "}
                  <a
                    href="mailto:liamclarke21@outlook.com"
                    className="text-ember underline transition-colors"
                  >
                    liamclarke21@outlook.com
                  </a>
                  .
                </p>

                <h3 className="font-display font-medium text-lg text-ink mt-6">Taxes</h3>
                <p>
                  All fees quoted are exclusive of VAT. If Qwikly becomes a registered VAT vendor, VAT
                  at the applicable rate will be added to invoices. You are responsible for any taxes
                  applicable to your own business.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 5. Data Handling and POPIA */}
            <div>
              <p className="eyebrow text-ember mb-3">05</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Data Handling &amp; POPIA Compliance
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Qwikly takes its obligations under the Protection of Personal Information Act 4 of 2013
                  (&ldquo;POPIA&rdquo;) seriously. By using the Service, you acknowledge that personal information
                  collected from your customers will be processed by Qwikly as an &ldquo;operator&rdquo; on your
                  behalf, and that you, as the business owner, are the &ldquo;responsible party&rdquo; under POPIA.
                </p>
                <p>
                  You warrant that you have obtained all necessary consents from your customers to allow
                  their personal information (including WhatsApp messages, contact details, and booking
                  information) to be processed by Qwikly and its sub-processors (Twilio, Anthropic, Supabase)
                  for the purposes of delivering the Service.
                </p>
                <p>
                  Qwikly will process personal information only to the extent necessary to provide the
                  Service and will implement reasonable technical and organisational measures to protect
                  personal information against unauthorised access, loss, or destruction. Full details of
                  our data practices are set out in our{" "}
                  <Link href="/legal/privacy" className="text-ember underline transition-colors">
                    Privacy Policy
                  </Link>
                  .
                </p>
                <p>
                  Data subjects whose personal information is processed through the Service have the right
                  to access, correct, or request deletion of their information. Requests should be directed
                  to{" "}
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

            {/* 6. Intellectual Property */}
            <div>
              <p className="eyebrow text-ember mb-3">06</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Intellectual Property
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  The Qwikly platform, including its software, design, branding, content, and technology,
                  is owned by Clarke Agency and protected by applicable intellectual property laws. You
                  are granted a limited, non-exclusive, non-transferable, revocable licence to use the
                  Service solely for your own business purposes in accordance with these Terms.
                </p>
                <p>
                  You may not copy, modify, distribute, sell, or lease any part of the Service, or reverse
                  engineer or attempt to extract the source code of the Service. You may not use Qwikly&rsquo;s
                  trademarks, logos, or branding without our prior written consent.
                </p>
                <p>
                  You retain ownership of all data and content you provide to the Service, including your
                  business information, service listings, and customer data. You grant Qwikly a limited
                  licence to use this data solely to provide and improve the Service.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 7. Limitation of Liability */}
            <div>
              <p className="eyebrow text-ember mb-3">07</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Limitation of Liability
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  THE SERVICE IS PROVIDED &ldquo;AS IS&rdquo; AND &ldquo;AS AVAILABLE&rdquo; WITHOUT WARRANTIES OF ANY KIND,
                  WHETHER EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
                  PURPOSE, OR NON-INFRINGEMENT.
                </p>
                <p>
                  TO THE MAXIMUM EXTENT PERMITTED BY SOUTH AFRICAN LAW, QWIKLY&rsquo;S TOTAL LIABILITY TO YOU
                  FOR ANY CLAIMS ARISING FROM OR RELATED TO THE SERVICE SHALL NOT EXCEED THE TOTAL FEES YOU
                  PAID TO QWIKLY IN THE 3 MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO THE CLAIM.
                  FOR USERS ON A FREE TRIAL, THIS LIMIT IS R0.
                </p>
                <p>
                  QWIKLY IS NOT LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE
                  DAMAGES, INCLUDING LOSS OF PROFITS, REVENUE, DATA, GOODWILL, OR BUSINESS OPPORTUNITY,
                  EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
                </p>
                <p>
                  QWIKLY IS NOT RESPONSIBLE FOR THE CONTENT OF AUTOMATED MESSAGES SENT ON YOUR BEHALF
                  WHERE SUCH CONTENT IS BASED ON INFORMATION YOU PROVIDED. YOU REMAIN RESPONSIBLE FOR ENSURING
                  ALL COMMUNICATIONS SENT THROUGH THE SERVICE COMPLY WITH APPLICABLE LAW.
                </p>
                <p>
                  Nothing in these Terms limits liability for death or personal injury caused by negligence,
                  fraud, or any other liability that cannot be excluded under South African law.
                </p>
                <p>
                  <strong className="text-ink font-medium">Force Majeure:</strong> Qwikly is not liable for
                  any failure or delay in performance caused by circumstances beyond our reasonable control,
                  including natural disasters, acts of government, pandemics, power outages, internet
                  infrastructure failures, or acts of third-party service providers.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 8. Indemnification */}
            <div>
              <p className="eyebrow text-ember mb-3">08</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Indemnification
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  You agree to indemnify, defend, and hold harmless Qwikly, Clarke Agency, and their
                  respective directors, employees, and agents from and against any claims, losses, damages,
                  costs, and expenses (including reasonable legal fees) arising from or related to:
                </p>
                <ul className="space-y-2 mt-2 ml-4">
                  {[
                    "Your use of the Service in violation of these Terms",
                    "Your violation of any applicable law or regulation, including POPIA",
                    "Your infringement of any third-party rights",
                    "Any content you provide to the Service",
                    "Your failure to obtain required consents from your customers",
                  ].map((item) => (
                    <li key={item} className="flex gap-3 text-sm leading-relaxed">
                      <span className="text-ember mt-0.5 shrink-0">·</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="rule" />

            {/* 9. Termination */}
            <div>
              <p className="eyebrow text-ember mb-3">09</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Termination
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  You may terminate your account at any time by contacting us at{" "}
                  <a
                    href="mailto:liamclarke21@outlook.com"
                    className="text-ember underline transition-colors"
                  >
                    liamclarke21@outlook.com
                  </a>
                  . Termination takes effect at the end of the current billing cycle, and any outstanding
                  fees for completed bookings remain payable.
                </p>
                <p>
                  We may suspend or terminate your account immediately, with or without notice, if we
                  have reasonable grounds to believe you have violated these Terms, are using the Service
                  to engage in unlawful activity, or pose a risk to other users or the integrity of the platform.
                </p>
                <p>
                  Upon termination, your right to access the Service ceases immediately. We will retain
                  your data for a period of 90 days after termination, after which it will be deleted
                  from our systems, except where we are required by law to retain it for longer. You may
                  request a data export before this period expires.
                </p>
                <p>
                  Sections 5 (Data Handling), 6 (Intellectual Property), 7 (Limitation of Liability),
                  8 (Indemnification), 10 (Governing Law), and 11 (Disputes) survive termination.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 10. Governing Law */}
            <div>
              <p className="eyebrow text-ember mb-3">10</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Governing Law
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  These Terms are governed by and construed in accordance with the laws of the Republic
                  of South Africa. The courts of South Africa shall have exclusive jurisdiction over any
                  dispute arising from or related to these Terms or your use of the Service.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 11. Dispute Resolution */}
            <div>
              <p className="eyebrow text-ember mb-3">11</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Dispute Resolution
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  Before initiating formal proceedings, both parties agree to attempt to resolve any dispute
                  informally by providing written notice describing the dispute. The parties will have 30
                  days from the date of notice to attempt good-faith resolution.
                </p>
                <p>
                  If informal resolution fails, disputes shall be submitted to binding arbitration
                  administered under the Arbitration Act 42 of 1965 (as amended), with proceedings
                  conducted in Johannesburg, South Africa, in the English language. The arbitrator&rsquo;s
                  decision shall be final and binding on both parties.
                </p>
                <p>
                  Nothing in this clause prevents either party from seeking urgent relief from a court
                  of competent jurisdiction where delay would cause irreparable harm.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 12. Changes to Terms */}
            <div>
              <p className="eyebrow text-ember mb-3">12</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Changes to These Terms
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  We may update these Terms from time to time. For material changes, we will notify you
                  by email at least 30 days before the changes take effect. Continued use of the Service
                  after the effective date of any changes constitutes your acceptance of the revised Terms.
                </p>
                <p>
                  The &ldquo;Last updated&rdquo; date at the top of this page always reflects the most recent revision.
                  We encourage you to review these Terms periodically.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 13. General */}
            <div>
              <p className="eyebrow text-ember mb-3">13</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                General Provisions
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  <strong className="text-ink font-medium">Entire Agreement.</strong>{" "}
                  These Terms, together with the Privacy Policy, constitute the entire agreement between
                  you and Qwikly regarding the Service and supersede all prior agreements.
                </p>
                <p>
                  <strong className="text-ink font-medium">Severability.</strong>{" "}
                  If any provision of these Terms is found to be unenforceable, the remaining provisions
                  will continue in full force and effect.
                </p>
                <p>
                  <strong className="text-ink font-medium">Waiver.</strong>{" "}
                  Our failure to enforce any provision of these Terms shall not constitute a waiver of
                  our right to enforce it in the future.
                </p>
                <p>
                  <strong className="text-ink font-medium">Assignment.</strong>{" "}
                  You may not assign your rights or obligations under these Terms without our prior written
                  consent. We may assign our rights in connection with a merger, acquisition, or sale of
                  assets without notice.
                </p>
                <p>
                  <strong className="text-ink font-medium">No Partnership.</strong>{" "}
                  Nothing in these Terms creates a partnership, joint venture, employment, or agency
                  relationship between you and Qwikly.
                </p>
              </div>
            </div>

            <div className="rule" />

            {/* 14. Contact */}
            <div>
              <p className="eyebrow text-ember mb-3">14</p>
              <h2 className="font-display font-medium text-2xl text-ink mb-4 tracking-tight">
                Contact
              </h2>
              <div className="space-y-4 text-ink-700 leading-relaxed text-base">
                <p>
                  For any questions about these Terms or the Service, please contact us:
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

                <p className="text-sm text-ink-500 pt-4">
                  Also see our{" "}
                  <Link href="/legal/privacy" className="text-ember underline transition-colors">
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
