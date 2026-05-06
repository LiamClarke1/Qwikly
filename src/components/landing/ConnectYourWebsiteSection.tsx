"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

const PREVIEW_MESSAGES = [
  { from: "bot", text: "Hey. What trade you in?" },
  { from: "visitor", text: "Electrician" },
  { from: "bot", text: "Right — how many leads a week do you lose to whoever replies first?" },
  { from: "visitor", text: "Probably 3 or 4" },
];

export function ConnectYourWebsiteSection() {
  return (
    <section className="py-20 px-6 bg-paper-deep">
      <div className="max-w-site mx-auto">
        <div className="rounded-3xl border border-line bg-paper overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2">

            {/* Left — text */}
            <div className="p-10 md:p-14 flex flex-col justify-center">
              <span className="inline-flex items-center gap-2 border border-ember/30 text-ember text-[0.75rem] font-semibold tracking-widest uppercase px-3 py-1 rounded-full mb-5 w-fit">
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
                Website channel
              </span>

              <h2
                className="font-display font-medium leading-tight mb-4 text-ink"
                style={{ fontSize: "clamp(1.8rem,3.5vw,2.8rem)", letterSpacing: "-0.03em" }}
              >
                Add website chat to your site
                <br />
                <span className="italic font-light">in 5 minutes.</span>
              </h2>

              <p className="text-ink-500 text-base leading-relaxed mb-6 max-w-lg">
                Paste one line of code. Visitors get answers in 30 seconds, day or night.
                Works on Wix, Squarespace, WordPress, Webflow, and any custom site.
                Lives on your website and handles every visitor automatically.
              </p>

              {/* Channel pills */}
              <div className="flex items-center gap-2 flex-wrap mb-8">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
                  </svg>
                  <span className="text-[11px] font-semibold text-blue-500">Website Chat</span>
                </div>
                <svg viewBox="0 0 16 16" className="w-3 h-3 text-ink-300" fill="none"><path d="M6 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ember/10 border border-ember/20">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 text-ember" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <span className="text-[11px] font-semibold text-ember">Email Notifications</span>
                </div>
              </div>

              <Link
                href="/connect-your-website"
                className="inline-flex items-center gap-2 text-ember font-semibold hover:underline cursor-pointer transition-colors w-fit"
              >
                Connect my website <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Right — live chat preview */}
            <div className="bg-[#1E1E1E] p-8 lg:p-10 flex items-center justify-center">
              <div className="w-full max-w-xs">
                {/* Widget panel */}
                <div className="rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                  {/* Header */}
                  <div className="px-4 py-3.5 bg-[#E85A2C] flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-white/25 flex items-center justify-center font-bold text-white text-xs">E</div>
                    <div>
                      <p className="text-white font-semibold text-xs leading-none">Electrician Pro</p>
                      <p className="text-white/70 text-[10px] flex items-center gap-1 mt-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                        Replies in 30s
                      </p>
                    </div>
                    <div className="ml-auto text-white/50 text-lg leading-none">×</div>
                  </div>

                  {/* Messages */}
                  <div className="bg-white p-3 space-y-2">
                    {PREVIEW_MESSAGES.map((msg, i) => (
                      <div key={i} className={`flex ${msg.from === "visitor" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-snug ${
                            msg.from === "visitor"
                              ? "bg-[#E85A2C] text-white rounded-br-sm"
                              : "bg-gray-100 text-gray-800 rounded-bl-sm"
                          }`}
                        >
                          {msg.text}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Input */}
                  <div className="bg-white border-t border-gray-100 px-3 py-2.5 flex items-center gap-2">
                    <div className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-[11px] text-gray-400">
                      Type a message…
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-[#E85A2C] flex items-center justify-center flex-shrink-0">
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="bg-white text-center py-1.5 text-[9px] text-gray-300 border-t border-gray-50">
                    Powered by <strong className="text-gray-400">Qwikly</strong>
                  </div>
                </div>

                {/* Launcher below */}
                <div className="flex justify-end mt-3">
                  <div className="inline-flex items-center gap-2 bg-[#E85A2C] text-white text-[11px] font-bold px-4 py-2.5 rounded-full shadow-lg">
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Reply in 30s
                  </div>
                </div>

                <p className="text-center text-white/30 text-[10px] mt-4">
                  This is what your website visitors see
                </p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
