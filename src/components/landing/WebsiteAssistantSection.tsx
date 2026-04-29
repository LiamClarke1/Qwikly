"use client";

import { Globe, Zap, Calendar, Bell } from "lucide-react";

const CHAT_MESSAGES = [
  { from: "visitor", text: "Hi, I need a plumber urgently — burst geyser in Randburg", time: "02:14" },
  { from: "bot", text: "Hi! We can help. Is the mains water turned off already?", time: "02:14" },
  { from: "visitor", text: "Yes just did it", time: "02:15" },
  { from: "bot", text: "Perfect. I can book a tech for 02:45 tonight. Shall I confirm that slot?", time: "02:15" },
  { from: "visitor", text: "Yes please", time: "02:15" },
  { from: "bot", text: "Booked. You'll get a confirmation now and the tech's number when they're 5 min away.", time: "02:15" },
];

export function WebsiteAssistantSection() {
  function openWidget() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).Qwikly?.open();
  }

  return (
    <section className="relative py-28 md:py-40 bg-ink text-paper overflow-hidden grain-dark">
      <div className="ember-blob w-[600px] h-[500px] top-10 -right-40" />
      <div className="dot-grid absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-site px-6 lg:px-10">
        {/* Label */}
        <p className="eyebrow text-ember mb-6">Website digital assistant</p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left — copy */}
          <div>
            <h2 className="display-lg text-paper leading-tight">
              That button in the corner?
              <br />
              <em className="italic font-light text-ember">That&rsquo;s the product.</em>
            </h2>
            <p className="mt-6 text-paper/70 text-lg leading-relaxed max-w-lg">
              The &ldquo;Reply in 30s&rdquo; button at the bottom right of this page is exactly what your
              website visitors will see. Click it and talk to it — this is the real thing,
              live, right now. Every lead that lands on your site will go through this.
            </p>

            <div className="mt-8 space-y-4">
              {[
                { icon: Zap, text: "Appears on your site in 5 minutes — one line of code" },
                { icon: Globe, text: "Handles every website visitor 24/7, replies in 30 seconds" },
                { icon: Calendar, text: "Books appointments straight into your Google Calendar" },
                { icon: Bell, text: "You get a WhatsApp ping the moment a job is confirmed" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-start gap-3">
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-ember/20 border border-ember/30 flex items-center justify-center flex-shrink-0">
                    <Icon className="w-2.5 h-2.5 text-ember" />
                  </span>
                  <p className="text-paper/75 leading-relaxed">{text}</p>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div className="mt-10 flex flex-wrap gap-4 items-center">
              <button
                onClick={openWidget}
                className="inline-flex items-center gap-3 bg-ember text-white font-semibold px-7 py-4 rounded-full hover:bg-ember/90 active:bg-ember/80 transition-colors cursor-pointer"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
                </svg>
                Try it now — it&rsquo;s live
              </button>
              <p className="text-paper/40 text-sm">No login. No form. Just talk to it.</p>
            </div>

            {/* Channels */}
            <div className="mt-10 pt-8 border-t border-paper/10 flex items-center gap-3 flex-wrap">
              <p className="text-paper/40 text-xs eyebrow mr-2">Also on</p>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#25D366]/10 border border-[#25D366]/20">
                <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0" fill="#25D366">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z" />
                </svg>
                <span className="text-[11px] font-semibold text-[#25D366]">WhatsApp</span>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-ember/10 border border-ember/20">
                <svg viewBox="0 0 24 24" className="w-3 h-3 flex-shrink-0 text-ember" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
                <span className="text-[11px] font-semibold text-ember">Email</span>
              </div>
              <span className="text-paper/40 text-xs">All three channels, one system.</span>
            </div>
          </div>

          {/* Right — browser mockup with live chat conversation */}
          <div className="relative">
            {/* Glowing backdrop */}
            <div className="absolute -inset-4 bg-ember/5 rounded-3xl blur-2xl" />

            {/* Browser window */}
            <div className="relative rounded-2xl overflow-hidden border border-paper/10 shadow-2xl bg-[#1a1a1a]">
              {/* Browser chrome */}
              <div className="px-4 py-3 bg-[#2a2a2a] border-b border-paper/[0.06] flex items-center gap-3">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                  <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
                </div>
                <div className="flex-1 mx-3">
                  <div className="bg-[#1a1a1a] rounded-md px-3 py-1 flex items-center gap-2">
                    <svg viewBox="0 0 24 24" className="w-2.5 h-2.5 text-paper/30 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 010 20M12 2a15.3 15.3 0 000 20"/></svg>
                    <span className="text-paper/30 text-[10px] font-mono">joburg-plumbing.co.za</span>
                  </div>
                </div>
              </div>

              {/* Page content */}
              <div className="relative p-5 bg-[#f8f7f4] min-h-[340px]">
                {/* Fake page content */}
                <div className="space-y-2 opacity-40">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="w-5 h-5 rounded bg-[#E85A2C]" />
                    <div className="h-2 w-24 rounded bg-gray-400" />
                  </div>
                  <div className="h-4 w-3/4 rounded bg-gray-300" />
                  <div className="h-3 w-full rounded bg-gray-200" />
                  <div className="h-3 w-5/6 rounded bg-gray-200" />
                  <div className="h-3 w-4/6 rounded bg-gray-200" />
                  <div className="mt-3 h-6 w-28 rounded-full bg-[#E85A2C]/60" />
                </div>

                {/* Chat panel — open with conversation */}
                <div className="absolute bottom-3 right-3 w-52 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden text-[11px]">
                  {/* Chat header */}
                  <div className="px-3 py-2.5 bg-[#E85A2C] flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-white/25 flex items-center justify-center text-white font-bold text-[8px]">J</div>
                    <div>
                      <p className="text-white font-semibold text-[10px] leading-none">Joburg Plumbing</p>
                      <p className="text-white/70 text-[8px] flex items-center gap-1 mt-0.5">
                        <span className="w-1 h-1 rounded-full bg-green-400" />
                        Replies in 30s
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <div className="p-2.5 space-y-1.5 max-h-40 overflow-hidden">
                    {CHAT_MESSAGES.slice(0, 4).map((msg, i) => (
                      <div key={i} className={`flex ${msg.from === "visitor" ? "justify-end" : "justify-start"}`}>
                        <div
                          className={`max-w-[85%] px-2 py-1.5 rounded-xl leading-snug ${
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

                  {/* Input bar */}
                  <div className="px-2 py-2 border-t border-gray-100 flex items-center gap-1.5">
                    <div className="flex-1 rounded-lg border border-gray-200 px-2 py-1 text-gray-400">Type a message…</div>
                    <div className="w-5 h-5 rounded-md bg-[#E85A2C] flex items-center justify-center flex-shrink-0">
                      <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="19" x2="12" y2="5" />
                        <polyline points="5 12 12 5 19 12" />
                      </svg>
                    </div>
                  </div>
                </div>

                {/* Launcher button */}
                <div className="absolute bottom-3 left-3">
                  <div className="inline-flex items-center gap-1.5 bg-[#E85A2C] text-white text-[10px] font-bold px-3 py-1.5 rounded-full shadow-lg">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                    Reply in 30s
                  </div>
                </div>
              </div>
            </div>

            {/* Floating "28 sec" badge */}
            <div className="absolute -top-4 -right-4 bg-ember text-white text-xs font-bold px-4 py-2 rounded-full shadow-lg">
              Replied in 28s
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
