"use client";

import Link from "next/link";
import { ArrowRight, Globe } from "lucide-react";

export function ConnectYourWebsiteSection() {
  return (
    <section className="py-20 px-6 bg-paper-deep">
      <div className="max-w-site mx-auto">
        <div className="rounded-3xl border border-line bg-paper p-10 md:p-14 flex flex-col md:flex-row items-center gap-10">
          {/* Text */}
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 border border-ember/30 text-ember text-[0.75rem] font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-5">
              <Globe className="w-3 h-3" />
              Already have a website?
            </span>
            <h2
              className="font-display font-medium leading-tight mb-4"
              style={{ fontSize: "clamp(2rem,4vw,3.2rem)", letterSpacing: "-0.03em" }}
            >
              Connect it to Qwikly
              <br />
              in 5 minutes.
            </h2>
            <p className="text-ink-500 text-lg leading-relaxed mb-6 max-w-lg">
              Paste one line of code. Visitors get answers in 30 seconds.
              Bookings go in your calendar. Works with Wix, Squarespace,
              WordPress, Webflow, and any custom site.
            </p>
            <Link
              href="/connect-your-website"
              className="inline-flex items-center gap-2 text-ember font-semibold hover:underline cursor-pointer transition-colors"
            >
              Connect my website <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Visual */}
          <div className="shrink-0 w-full md:w-72">
            <div className="relative rounded-2xl border border-line bg-paper-deep p-6 h-52 flex flex-col justify-end">
              {/* Fake site lines */}
              <div className="absolute top-5 left-5 right-5 space-y-2 opacity-30">
                <div className="h-2 w-20 bg-ink-300 rounded" />
                <div className="h-1.5 w-full bg-ink-200 rounded" />
                <div className="h-1.5 w-4/5 bg-ink-200 rounded" />
                <div className="h-1.5 w-3/5 bg-ink-200 rounded" />
              </div>
              {/* Chat launcher */}
              <div className="self-end flex items-center gap-2 bg-ember text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                Message us
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
