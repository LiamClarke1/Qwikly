"use client";

import { useState } from "react";
import { Copy, Send } from "lucide-react";

export interface EmailComposerProps {
  initialSubject: string;
  initialBody: string;
  toEmail: string | null;
}

export function EmailComposer({
  initialSubject,
  initialBody,
  toEmail,
}: EmailComposerProps) {
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);
  const [copied, setCopied] = useState(false);

  function copyBody() {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  function openMail() {
    const to = toEmail ? encodeURIComponent(toEmail) : "";
    const s = encodeURIComponent(subject);
    const b = encodeURIComponent(body);
    if (typeof window !== "undefined") {
      window.location.href = `mailto:${to}?subject=${s}&body=${b}`;
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-[11.5px] font-mono uppercase tracking-wider text-ink-500">
          Subject
        </label>
        <input
          type="text"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className="w-full rounded-md bg-white border border-ink/10 text-[13.5px] text-ink p-2.5 focus:outline-none focus:border-ink/25"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-[11.5px] font-mono uppercase tracking-wider text-ink-500">
          Body
        </label>
        <textarea
          rows={12}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-md bg-white border border-ink/10 text-[13.5px] text-ink p-2.5 font-sans leading-relaxed focus:outline-none focus:border-ink/25"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openMail}
          disabled={!toEmail}
          className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-4 py-2 text-[13px] font-medium hover:bg-ink-800 disabled:opacity-50"
        >
          <Send className="w-3.5 h-3.5" />
          Open in mail client
        </button>
        <button
          type="button"
          onClick={copyBody}
          className="inline-flex items-center gap-2 rounded-full bg-white border border-ink/10 text-ink px-4 py-2 text-[13px] font-medium hover:bg-[#F9F6F2]"
        >
          <Copy className="w-3.5 h-3.5" />
          {copied ? "Copied" : "Copy body"}
        </button>
      </div>
    </div>
  );
}
