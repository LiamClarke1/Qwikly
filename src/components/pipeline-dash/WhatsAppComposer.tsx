"use client";

import { useState } from "react";
import { MessageCircle, Copy } from "lucide-react";

export function WhatsAppComposer({
  phone,
  initialBody,
}: {
  phone: string | null;
  initialBody: string;
}) {
  const [body, setBody] = useState(initialBody);
  const [copied, setCopied] = useState(false);

  function openWa() {
    const cleaned = (phone || "").replace(/[^0-9]/g, "");
    const text = encodeURIComponent(body);
    const url = cleaned
      ? `https://wa.me/${cleaned}?text=${text}`
      : `https://wa.me/?text=${text}`;
    if (typeof window !== "undefined") {
      window.open(url, "_blank", "noopener");
    }
  }

  function copyBody() {
    if (typeof navigator === "undefined") return;
    navigator.clipboard.writeText(body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-1.5">
        <label className="text-[11.5px] font-mono uppercase tracking-wider text-ink-500">
          WhatsApp message
        </label>
        <textarea
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="w-full rounded-md bg-white border border-ink/10 text-[13.5px] text-ink p-2.5 leading-relaxed focus:outline-none focus:border-ink/25"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={openWa}
          className="inline-flex items-center gap-2 rounded-full bg-ink text-paper px-4 py-2 text-[13px] font-medium hover:bg-ink-800"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Open WhatsApp
        </button>
        <button
          type="button"
          onClick={copyBody}
          className="inline-flex items-center gap-2 rounded-full bg-white border border-ink/10 text-ink px-4 py-2 text-[13px] font-medium hover:bg-[#F9F6F2]"
        >
          <Copy className="w-3.5 h-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      {!phone ? (
        <p className="text-[12px] text-ink-400 italic">
          No phone number on file, the message will open in WhatsApp with the body
          prefilled so you can paste in a number.
        </p>
      ) : null}
    </div>
  );
}
