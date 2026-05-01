import type { Metadata } from "next";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Qwikly team. We're based in Johannesburg and reply within one business day.",
  alternates: { canonical: "https://www.qwikly.co.za/contact" },
};

export default function ContactPage() {
  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">Contact</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-4">
            We&rsquo;re in Johannesburg.
            <br />
            <em className="italic font-light">Talk to a human.</em>
          </h1>
          <p className="text-ink-700 text-lg leading-relaxed mb-16 max-w-xl">
            Questions about pricing, setup, or whether Qwikly works for your business. We
            reply within one business day.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-10">
            {/* Contact details */}
            <div className="md:col-span-4 space-y-8">
              <div>
                <p className="eyebrow text-ink-500 mb-3">Email</p>
                <a
                  href="mailto:hello@qwikly.co.za"
                  className="font-display text-lg text-ink hover:text-ember transition-colors"
                >
                  hello@qwikly.co.za
                </a>
              </div>

              <div>
                <p className="eyebrow text-ink-500 mb-3">Hours</p>
                <p className="text-sm text-ink-700 leading-relaxed">
                  Mon&ndash;Fri 08:00&ndash;17:00 SAST
                  <br />
                  <span className="text-ink-400">
                    Qwikly itself never stops. Just us humans.
                  </span>
                </p>
              </div>

              <div>
                <p className="eyebrow text-ink-500 mb-3">Location</p>
                <p className="text-sm text-ink-700">Johannesburg, South Africa</p>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-8">
              <ContactForm />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
