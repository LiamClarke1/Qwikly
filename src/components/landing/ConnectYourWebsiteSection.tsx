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
                Joins WhatsApp and email as your third channel.
              </p>

              {/* Channel pills */}
              <div className="flex items-center gap-2 flex-wrap mb-8">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#25D366]/10 border border-[#25D366]/20">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="#25D366">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                  </svg>
                  <span className="text-[11px] font-semibold text-[#25D366]">WhatsApp</span>
                </div>
                <svg viewBox="0 0 16 16" className="w-3 h-3 text-ink-300" fill="none"><path d="M6 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ember/10 border border-ember/20">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 text-ember" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                  <span className="text-[11px] font-semibold text-ember">Email</span>
                </div>
                <svg viewBox="0 0 16 16" className="w-3 h-3 text-ink-300" fill="none"><path d="M6 8h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-blue-500/10 border border-blue-500/20">
                  <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 text-blue-500" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/>
                  </svg>
                  <span className="text-[11px] font-semibold text-blue-500">Website Chat</span>
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
