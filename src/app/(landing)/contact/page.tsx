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

        This page intentionally breaks the eyebrow + H1 + grid pattern used
        on the other subpages. It should read like a short personal letter,
        not a marketing page. Quiet, generous whitespace, almost zero chrome.
      */}

      <section className="pt-36 md:pt-44 pb-24 px-6">
        <div className="max-w-2xl mx-auto">
          {/* The opening: a single huge serif word, plus a short letter. */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-10 md:gap-12 mb-16 md:mb-20">
            <div className="flex-1 min-w-0">
              <h1
                className="font-display font-medium text-ink leading-[0.9] tracking-tight mb-8"
                style={{ fontSize: "clamp(5rem, 12vw, 12rem)" }}
              >
                Hi<span className="text-ember">.</span>
              </h1>

              <div className="space-y-5 text-ink-700 text-lg leading-relaxed max-w-prose">
                <p>
                  Tell us what&rsquo;s on your mind. Whether you&rsquo;re thinking about
                  Qwikly for your own business, or you want to chat about building
                  something with us, this form lands straight in our inbox.
                </p>
                <p>
                  We read every message and reply within one business day.
                </p>
                <p className="font-display italic text-ink">
                  Liam, founder.
                </p>
              </div>
            </div>

            {/* The corner of the stationery: small, right-aligned details. */}
            <aside className="md:text-right text-ink-500 text-sm leading-relaxed space-y-4 md:pt-4 md:w-44 shrink-0">
              <div>
                <a
                  href="mailto:hello@qwikly.co.za"
                  className="text-ink hover:text-ember transition-colors"
                >
                  hello@qwikly.co.za
                </a>
              </div>
              <div>
                Mon&ndash;Fri
                <br />
                08:00, 17:00 SAST
              </div>
              <div>
                Cape Town,
                <br />
                South Africa
              </div>
            </aside>
          </div>

          {/* The notecard: form sits inside a soft paper-deep panel. */}
          <div
            className="bg-paper-deep rounded-2xl px-6 py-10 md:px-12 md:py-14"
            style={{
              boxShadow:
                "inset 0 1px 2px rgba(60, 40, 20, 0.06), inset 0 0 0 1px rgba(60, 40, 20, 0.04)",
            }}
          >
            <Suspense
              fallback={
                <div className="text-ink-500">Loading form, one second...</div>
              }
            >
              <ContactForm />
            </Suspense>
          </div>

          {/* Quiet sign-off line. */}
          <p className="text-center text-ink-500 text-sm mt-12">
            Cape Town, South Africa &middot; Mon&ndash;Fri 08:00, 17:00 SAST
          </p>
        </div>
      </section>
    </div>
  );
}
