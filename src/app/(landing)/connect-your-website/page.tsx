import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Code, Calendar, Zap } from "lucide-react";
import CTAButton from "@/components/CTAButton";

export const metadata: Metadata = {
  title: "Connect Your Website | Book Leads Directly From Your Site",
  description:
    "Paste one line of code into your Wix, Squarespace, or WordPress site. Qwikly's digital assistant answers visitors in 30 seconds, qualifies leads, and books into your Google Calendar automatically.",
  openGraph: {
    title: "Connect Your Website | Qwikly",
    description: "Qwikly's digital assistant answers visitors in 30 seconds, qualifies them, and books the job.",
    url: "https://www.qwikly.co.za/connect-your-website",
    type: "website",
  },
};

const HOW_STEPS = [
  {
    Icon: Code,
    num: "01",
    title: "Paste one line of code",
    body: "Works with Wix, Squarespace, WordPress, Webflow, Shopify, or any custom site. If you can edit your site, you can install Qwikly — most people are done in 5 minutes.",
  },
  {
    Icon: Zap,
    num: "02",
    title: "Your digital assistant answers visitors",
    body: "Qualifies the job, asks for area and timing, pre-screens before anything reaches your calendar.",
  },
  {
    Icon: Calendar,
    num: "03",
    title: "Bookings land in your calendar",
    body: "Real slots from your Google Calendar are offered and confirmed. You get a WhatsApp alert with full details.",
  },
];

const COMPARISON = [
  { label: "Reply speed",              form: "2–24 hrs",  chatbot: "Instant", qwikly: "30 sec" },
  { label: "Books into your calendar", form: "No",        chatbot: "No",      qwikly: "Yes" },
  { label: "Knows your services",      form: "No",        chatbot: "No",      qwikly: "Yes" },
  { label: "Trained for your trade",   form: "No",        chatbot: "No",      qwikly: "Yes" },
  { label: "24/7 availability",        form: "No",        chatbot: "Yes",     qwikly: "Yes" },
];

const PLATFORMS = ["Wix", "Squarespace", "WordPress", "Webflow", "Shopify", "Custom HTML"];

const FAQS = [
  { q: "Will it slow my site down?", a: "The widget script is under 14 KB and loads after your page. Your visitors won't notice any difference." },
  { q: "What does it look like to my visitors?", a: "A small chat launcher in the corner of your site. When clicked, it opens a clean intake form then a conversation, styled to match your brand colour." },
  { q: "Can I customise the colour to match my brand?", a: "Yes. During setup you pick any accent colour and it applies across the launcher and chat bubbles." },
  { q: "What if I don't have a developer?", a: "You don't need one. The install is a single copy-paste into your site's Custom Code settings. If you get stuck, book a free 15-minute install call and we'll do it for you." },
  { q: "Does this replace my contact form?", a: "It can sit alongside it. Most clients find the widget converts better because it qualifies and books immediately rather than waiting for a follow-up." },
  { q: "Do I still need WhatsApp?", a: "WhatsApp remains a separate channel. The widget handles visitors on your own site specifically." },
  { q: "What happens if my Google Calendar is full?", a: "The AI offers the next available slot the following business day. If after-hours mode is on, it queues overnight and offers slots first thing." },
  { q: "How do I cancel?", a: "Cancel any time from your dashboard. No contracts, no lock-in." },
];

export default function ConnectYourWebsitePage() {
  return (
    <div className="bg-paper text-ink">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-site mx-auto max-w-3xl">
          <span className="inline-block border border-ember/30 text-ember text-[0.75rem] font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-6">
            New — Website Channel
          </span>
          <h1 className="font-display font-medium leading-[0.93] tracking-tight mb-6"
              style={{ fontSize: "clamp(2.8rem,7vw,6rem)", letterSpacing: "-0.035em" }}>
            Your website doesn&rsquo;t sleep.
            <br />
            <span className="text-ember">Now your replies don&rsquo;t either.</span>
          </h1>
          <p className="text-ink-500 text-xl leading-relaxed mb-10 max-w-2xl">
            Connect your existing website to a Qwikly digital assistant. Visitors get answers in 30 seconds,
            jobs get qualified, bookings go straight into your calendar — even at 11 pm.
          </p>
          <div className="flex flex-wrap gap-4 items-center">
            <CTAButton href="/signup" size="lg">
              Connect my website — free for 7 days
            </CTAButton>
            <Link
              href="#how-it-works"
              className="inline-flex items-center gap-2 text-ink-600 hover:text-ink transition-colors text-[0.95rem] cursor-pointer"
            >
              See how it works <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-paper-deep">
        <div className="max-w-site mx-auto px-6">
          <h2 className="font-display text-4xl font-medium tracking-tight mb-14 text-center"
              style={{ letterSpacing: "-0.03em" }}>
            Three steps to live
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_STEPS.map(({ Icon, num, title, body }) => (
              <div key={num} className="bg-paper rounded-2xl p-8 border border-line">
                <div className="w-10 h-10 rounded-xl bg-ember/10 flex items-center justify-center mb-4">
                  <Icon className="w-5 h-5 text-ember" />
                </div>
                <span className="text-ember text-xs font-mono font-bold tracking-widest">{num}</span>
                <h3 className="font-display text-xl font-medium mt-1 mb-3" style={{ letterSpacing: "-0.02em" }}>{title}</h3>
                <p className="text-ink-500 leading-relaxed text-[0.95rem]">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-site mx-auto">
          <h2 className="font-display text-4xl font-medium tracking-tight mb-12 text-center"
              style={{ letterSpacing: "-0.03em" }}>
            Why not just use a contact form?
          </h2>
          <div className="overflow-x-auto rounded-2xl border border-line">
            <table className="w-full text-[0.9rem]">
              <thead>
                <tr className="bg-paper-deep border-b border-line">
                  <th className="text-left py-4 px-6 font-medium text-ink-500 w-[35%]" />
                  <th className="py-4 px-4 font-medium text-ink-500 text-center">Contact form</th>
                  <th className="py-4 px-4 font-medium text-ink-500 text-center">Generic chatbot</th>
                  <th className="py-4 px-4 font-semibold text-ember text-center">Qwikly</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr key={row.label} className={i % 2 === 0 ? "bg-paper" : "bg-paper-deep"}>
                    <td className="py-4 px-6 text-ink-700 font-medium">{row.label}</td>
                    <td className="py-4 px-4 text-center text-ink-500">{row.form}</td>
                    <td className="py-4 px-4 text-center text-ink-500">{row.chatbot}</td>
                    <td className="py-4 px-4 text-center font-semibold text-ember">{row.qwikly}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* ── Platform logos ───────────────────────────────────────────── */}
      <section className="py-16 bg-paper-deep">
        <div className="max-w-site mx-auto px-6 text-center">
          <p className="text-ink-500 text-[0.8rem] font-semibold uppercase tracking-widest mb-8">
            Install on any platform
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            {PLATFORMS.map((p) => (
              <span
                key={p}
                className="px-5 py-2.5 bg-paper border border-line rounded-full text-ink-700 font-medium text-[0.9rem]"
              >
                {p}
              </span>
            ))}
          </div>
          <p className="mt-6 text-ink-500 text-sm">
            If you can edit your site, you can install Qwikly. Most people are done in 5 minutes.
          </p>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────────── */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-4xl font-medium tracking-tight mb-12 text-center"
              style={{ letterSpacing: "-0.03em" }}>
            Common questions
          </h2>
          <div className="divide-y divide-line border border-line rounded-2xl overflow-hidden">
            {FAQS.map(({ q, a }) => (
              <details key={q} className="group bg-paper">
                <summary className="flex items-center justify-between px-6 py-5 cursor-pointer list-none select-none">
                  <span className="font-medium text-ink text-[0.95rem] pr-4">{q}</span>
                  <ArrowRight className="w-4 h-4 text-ink-400 rotate-90 group-open:-rotate-90 transition-transform duration-200 shrink-0" />
                </summary>
                <div className="px-6 pb-5 text-ink-500 text-[0.9rem] leading-relaxed">{a}</div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ─────────────────────────────────────────────────── */}
      <section className="py-24 bg-ink text-paper">
        <div className="max-w-site mx-auto px-6 text-center">
          <h2 className="font-display text-4xl md:text-5xl font-medium tracking-tight mb-4"
              style={{ letterSpacing: "-0.03em" }}>
            Get your assistant live in 10 minutes.
          </h2>
          <p className="text-paper/60 mb-10 text-lg">Free for 7 days. No credit card. One line of code.</p>
          <CTAButton href="/signup" size="lg">
            Connect my website
          </CTAButton>
        </div>
      </section>
    </div>
  );
}
