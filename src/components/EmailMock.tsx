"use client";

import { Mail, Reply, Clock } from "lucide-react";

export default function EmailMock() {
  return (
    <div className="bg-white rounded-2xl shadow-xl border border-border max-w-sm w-full overflow-hidden">
      {/* Email client header */}
      <div className="bg-[#f1f5f9] px-4 py-2.5 border-b border-border flex items-center gap-2">
        <Mail className="w-4 h-4 text-muted" />
        <span className="text-xs font-medium text-foreground">Inbox</span>
        <span className="ml-auto text-[10px] text-muted">2 messages</span>
      </div>

      {/* Incoming email */}
      <div className="px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-bold text-purple-600">SN</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-foreground truncate">
              sarah.nkosi@gmail.com
            </p>
            <p className="text-[10px] text-muted truncate">
              To: info@sparkelectrical.co.za
            </p>
          </div>
        </div>
        <p className="text-xs font-semibold text-foreground mb-1.5">
          Need an electrician for DB board
        </p>
        <p className="text-[11px] text-muted leading-relaxed">
          Hi, I found your business online. My DB board keeps tripping and I
          need someone to come check it. I&apos;m in Sandton. Are you available
          this week?
        </p>
      </div>

      {/* AI reply */}
      <div className="px-4 py-3 bg-blue-50/40">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-cta/10 flex items-center justify-center flex-shrink-0">
            <Reply className="w-3.5 h-3.5 text-cta" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-foreground truncate">
              info@sparkelectrical.co.za
            </p>
            <p className="text-[10px] text-muted truncate">
              To: sarah.nkosi@gmail.com
            </p>
          </div>
          <span className="flex items-center gap-1 bg-green-100 text-green-700 text-[9px] font-medium px-2 py-0.5 rounded-full flex-shrink-0">
            <Clock className="w-2.5 h-2.5" />
            45s
          </span>
        </div>
        <p className="text-xs font-semibold text-foreground mb-1.5">
          Re: Need an electrician for DB board
        </p>
        <div className="text-[11px] text-foreground leading-relaxed space-y-2">
          <p>Hi Sarah,</p>
          <p>
            Thanks for reaching out! I can definitely help with that. DB board
            issues are one of our specialties.
          </p>
          <p>Just a couple of quick questions:</p>
          <ul className="list-disc list-inside text-muted space-y-0.5 ml-1">
            <li>What&apos;s your full address in Sandton?</li>
            <li>
              Is this urgent (tripping frequently) or can it wait a few days?
            </li>
          </ul>
          <p>
            I&apos;ve got availability tomorrow morning or Thursday afternoon.
            Which works better for you?
          </p>
          <p className="text-muted">
            Best,
            <br />
            Spark Electrical
          </p>
        </div>
      </div>
    </div>
  );
}
