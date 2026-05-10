import type { Metadata } from "next";
import { Suspense } from "react";
import ContactForm from "./ContactForm";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Get in touch with the Qwikly team. We're based in Cape Town and reply within one business day.",
  alternates: { canonical: "https://www.qwikly.co.za/contact" },
};

export default function ContactPage() {
  return (
    <div className="bg-paper min-h-screen">
      {/*
        The Qwikly chat widget loads site-wide via WidgetLoader (mounted in
        the landing layout), so /contact gets it for free with the same
        compact mode as every other page. No per-page mount needed.
      */}

      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">Contact</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-4">
            Talk to us about{" "}
            <em className="italic font-light">Qwikly.</em>
          </h1>
          <p className="text-ink-700 text-lg leading-relaxed mb-16 max-w-xl">
            Two services. Tell us what you want to do, we will route you to the
            right person.
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
                <p className="text-sm text-ink-700">Cape Town, South Africa</p>
              </div>
            </div>

            {/* Form */}
            <div className="md:col-span-8">
              <Suspense fallback={<div className="text-ink-500">Loading form, one second...</div>}>
                <ContactForm />
              </Suspense>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
