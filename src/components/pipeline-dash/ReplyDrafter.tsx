"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy as CopyIcon, Send, Save } from "lucide-react";
import { supabase } from "@/lib/supabase";

// Reply Drafter, two column. Inbound on the left, drafted response on the right.
// Pattern matching is client side keyword heuristics, no backend yet.
// Internal-only term, "AI" or "bot" never appears in user-visible copy here.

export interface ProspectOption {
  id: string;
  business: string;
  first_name?: string | null;
  email?: string | null;
}

export interface ReplyPattern {
  id: string;
  label: string;
  triggers: string[];
  draft: string;
}

// 11 patterns, copy mirrors Mission Control. Order matches the spec.
export const REPLY_PATTERNS: ReplyPattern[] = [
  {
    id: "not_interested",
    label: "Not interested / not now",
    triggers: ["not looking", "not now", "no thanks", "not interested", "pass for now"],
    draft: [
      "Hi {firstName},",
      "",
      "All good, thanks for the quick reply. If things change down the line, just reach out and I will pick it back up.",
      "",
      "Best,",
      "Liam",
    ].join("\n"),
  },
  {
    id: "send_pricing",
    label: "Send pricing / info",
    triggers: ["pricing", "price", "how much", "cost", "send info", "send me info"],
    draft: [
      "Hi {firstName},",
      "",
      "Happy to share. Our pricing for {business} sized businesses sits at R1,499 per month, flat. No setup fee, no lock in, cancel any time.",
      "",
      "I can send a one pager with the inclusions, or jump on a 15 minute call to walk you through. Which is easier?",
      "",
      "Liam",
    ].join("\n"),
  },
  {
    id: "tell_me_more",
    label: "Tell me more",
    triggers: ["tell me more", "more info", "more information", "interested", "curious"],
    draft: [
      "Hi {firstName},",
      "",
      "Sure. In short, we plug a small chat helper onto your site that replies to visitors in under a minute, qualifies them, and books them straight into your calendar.",
      "",
      "Happy to send a 90 second walkthrough recorded for {business}, or set up a quick call. What works?",
      "",
      "Liam",
    ].join("\n"),
  },
  {
    id: "whats_the_catch",
    label: "What's the catch?",
    triggers: ["catch", "scam", "too good", "what is the catch", "whats the catch"],
    draft: [
      "Hi {firstName},",
      "",
      "Fair question. There is no catch, R1,499 per month, no setup, no lock in. We make money when you stick around, so the catch, if there is one, is that we have to actually deliver leads.",
      "",
      "Want me to send a short walkthrough?",
      "",
      "Liam",
    ].join("\n"),
  },
  {
    id: "yes_lets_chat",
    label: "Yes let's chat / book a call",
    triggers: ["let's chat", "lets chat", "book a call", "book a time", "call", "happy to chat"],
    draft: [
      "Hi {firstName},",
      "",
      "Great, here is my calendar, https://calendar.app.google/qwikly-liam, grab any slot that suits.",
      "",
      "If none of those work, send me two times that suit and I will make one work.",
      "",
      "Liam",
    ].join("\n"),
  },
  {
    id: "feature_question",
    label: "Specific feature question (CRM/integration)",
    triggers: ["crm", "integrate", "integration", "zapier", "hubspot", "pipedrive", "api"],
    draft: [
      "Hi {firstName},",
      "",
      "Good question. We push leads straight to your inbox by default. We also support Zapier, so anything that lives on Zapier (HubSpot, Pipedrive, Google Sheets, Sheets etc) is one step away.",
      "",
      "Want me to map out exactly how it would work for {business}?",
      "",
      "Liam",
    ].join("\n"),
  },
  {
    id: "worried_quality",
    label: "Worried about quality",
    triggers: ["quality", "worried", "concerned", "sound natural", "weird", "robotic"],
    draft: [
      "Hi {firstName},",
      "",
      "Totally fair. Every reply is grounded in the info you give us about {business}, and you can review or adjust the tone before we go live. If a question is out of scope, the helper hands off to you rather than guessing.",
      "",
      "Happy to send a sample tuned to your site. Want that?",
      "",
      "Liam",
    ].join("\n"),
  },
  {
    id: "wrong_person",
    label: "Not the right person talk to X",
    triggers: ["wrong person", "talk to", "not the right person", "forward", "speak to"],
    draft: [
      "Hi {firstName},",
      "",
      "Appreciated, thanks for pointing me to the right person. Could you share their email and I will reach out directly, with you copied if useful.",
      "",
      "Liam",
    ].join("\n"),
  },
  {
    id: "have_similar",
    label: "Already have something similar",
    triggers: ["already have", "already use", "have something", "currently using", "we use"],
    draft: [
      "Hi {firstName},",
      "",
      "Got it, totally fair. Out of curiosity, what are you using at the moment? If it is working, brilliant. If there is a gap (speed of reply, after hours coverage, qualifying), happy to compare notes.",
      "",
      "Liam",
    ].join("\n"),
  },
  {
    id: "pricing_pushback",
    label: "Pricing pushback",
    triggers: ["too expensive", "expensive", "out of budget", "cheaper", "budget", "afford"],
    draft: [
      "Hi {firstName},",
      "",
      "Hear you. The way I think about it, one extra booked job at {business} usually pays for the year. If the maths still does not work, no hard feelings.",
      "",
      "If it helps, I can show you a 30 day trial set up so you only pay if a real lead lands. Want that?",
      "",
      "Liam",
    ].join("\n"),
  },
  {
    id: "send_proposal",
    label: "Send a proposal",
    triggers: ["proposal", "send a proposal", "scope of work", "sow", "quote"],
    draft: [
      "Hi {firstName},",
      "",
      "Sure, I will put a one page proposal together for {business} today. Two quick questions so I can tailor it,",
      "",
      "1, how many enquiries does your site get in a typical month?",
      "2, what does a good new customer look like for you?",
      "",
      "Liam",
    ].join("\n"),
  },
  {
    id: "long_hot",
    label: "Long thoughtful reply (HOT)",
    triggers: [],
    draft: [
      "Hi {firstName},",
      "",
      "Thanks for the detailed note, that gives me a much clearer picture of where {business} is right now.",
      "",
      "I would love to talk this through properly rather than reply in writing. I have time tomorrow afternoon or Thursday morning, both 20 minutes. Which suits, and which number is best?",
      "",
      "Liam",
    ].join("\n"),
  },
];

function detectLongHot(text: string): boolean {
  // Long, multi-sentence, thoughtful replies are flagged as HOT.
  if (!text) return false;
  const words = text.trim().split(/\s+/).length;
  const sentences = text.split(/[.!?]/).filter((s) => s.trim().length > 4).length;
  return words >= 80 && sentences >= 3;
}

function matchPattern(text: string): ReplyPattern | null {
  if (!text || text.trim().length < 3) return null;
  const lower = text.toLowerCase();
  for (const p of REPLY_PATTERNS) {
    if (p.id === "long_hot") continue;
    if (p.triggers.some((t) => lower.includes(t.toLowerCase()))) {
      return p;
    }
  }
  if (detectLongHot(text)) {
    return REPLY_PATTERNS.find((p) => p.id === "long_hot") || null;
  }
  return null;
}

function detectProspect(text: string, prospects: ProspectOption[]): ProspectOption | null {
  if (!text || prospects.length === 0) return null;
  const lower = text.toLowerCase();
  for (const p of prospects) {
    const biz = (p.business || "").trim();
    if (biz && biz.length >= 3 && lower.includes(biz.toLowerCase())) return p;
  }
  for (const p of prospects) {
    const fn = (p.first_name || "").trim();
    if (fn && fn.length >= 3 && lower.includes(fn.toLowerCase())) return p;
  }
  return null;
}

function renderDraft(pattern: ReplyPattern, prospect: ProspectOption | null): string {
  const vars: Record<string, string> = {
    firstName: prospect?.first_name || "there",
    business: prospect?.business || "your business",
  };
  return pattern.draft.replace(/\{(firstName|business)\}/g, (_m, k) => vars[k] ?? "");
}

interface Toast {
  message: string;
  tone: "success" | "warn";
}

export function ReplyDrafter() {
  const [prospects, setProspects] = useState<ProspectOption[]>([]);
  const [inbound, setInbound] = useState("");
  const [draft, setDraft] = useState("");
  const [selectedProspectId, setSelectedProspectId] = useState<string>("");
  const [matchedPatternId, setMatchedPatternId] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error } = await supabase
          .from("pipeline_prospects")
          .select("id, name, company, first_name, email")
          .order("created_at", { ascending: false })
          .limit(500);
        if (cancelled) return;
        if (error || !data) {
          setProspects([]);
          return;
        }
        // Map flexible row shape into the local option, name often is the contact name,
        // company is the business. Fallback to whichever exists.
        const rows: ProspectOption[] = (data as unknown[]).map((r) => {
          const row = r as unknown as {
            id: string;
            name: string | null;
            company: string | null;
            first_name: string | null;
            email: string | null;
          };
          return {
            id: row.id,
            business: row.company || row.name || "Unknown",
            first_name: row.first_name || (row.name ? row.name.split(" ")[0] : null),
            email: row.email,
          };
        });
        setProspects(rows);
      } catch {
        setProspects([]);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const selectedProspect = useMemo(
    () => prospects.find((p) => p.id === selectedProspectId) || null,
    [prospects, selectedProspectId]
  );

  function handleInboundChange(value: string) {
    setInbound(value);
    const matched = matchPattern(value);
    setMatchedPatternId(matched?.id || null);
    if (!selectedProspectId) {
      const detected = detectProspect(value, prospects);
      if (detected) setSelectedProspectId(detected.id);
    }
    if (matched) {
      setDraft(renderDraft(matched, selectedProspect ?? detectProspect(value, prospects)));
    }
  }

  function applyPattern(patternId: string) {
    const pat = REPLY_PATTERNS.find((p) => p.id === patternId);
    if (!pat) return;
    setMatchedPatternId(patternId);
    setDraft(renderDraft(pat, selectedProspect));
  }

  async function copyDraft() {
    if (!draft) {
      setToast({ message: "Draft is empty", tone: "warn" });
      return;
    }
    try {
      await navigator.clipboard.writeText(draft);
      setToast({ message: "Copied to clipboard", tone: "success" });
    } catch {
      setToast({ message: "Copy failed, select and copy manually", tone: "warn" });
    }
  }

  function sendViaOutlook() {
    if (!draft) {
      setToast({ message: "Draft is empty", tone: "warn" });
      return;
    }
    const to = selectedProspect?.email || "";
    const subject = selectedProspect?.business
      ? `Re: ${selectedProspect.business}`
      : "Re: our chat";
    const url = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(
      subject
    )}&body=${encodeURIComponent(draft)}`;
    if (typeof window !== "undefined") {
      window.location.href = url;
    }
    setToast({ message: "Outlook opening,", tone: "success" });
  }

  function saveAsTemplate() {
    if (!draft) {
      setToast({ message: "Draft is empty", tone: "warn" });
      return;
    }
    // Lightweight client-side save for now, real persistence wires later.
    try {
      const name = typeof window !== "undefined" ? window.prompt("Template name?") : null;
      if (!name) return;
      const KEY = "qwikly.savedReplies";
      const existing = JSON.parse(
        (typeof window !== "undefined" && window.localStorage.getItem(KEY)) || "[]"
      ) as Array<{ name: string; body: string; saved_at: string }>;
      existing.push({ name, body: draft, saved_at: new Date().toISOString() });
      window.localStorage.setItem(KEY, JSON.stringify(existing));
      setToast({ message: "Template saved locally", tone: "success" });
    } catch {
      setToast({ message: "Could not save template", tone: "warn" });
    }
  }

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  const matched = matchedPatternId
    ? REPLY_PATTERNS.find((p) => p.id === matchedPatternId)
    : null;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* LEFT: Inbound message */}
        <section className="ed-card flex flex-col gap-4">
          <div className="font-display text-[18px] tracking-tight text-ink">
            Inbound message
          </div>
          <div className="flex flex-col gap-2">
            <label
              htmlFor="reply-in"
              className="eyebrow text-ink-500"
            >
              Paste their reply (optional: paste the full email with subject)
            </label>
            <textarea
              id="reply-in"
              value={inbound}
              onChange={(e) => handleInboundChange(e.target.value)}
              rows={10}
              placeholder="Hi Liam, thanks but we're not looking right now,"
              className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink/10 text-[13.5px] text-ink placeholder:text-ink-400 focus:outline-none focus:border-ink/25 leading-relaxed resize-y"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="reply-prospect" className="eyebrow text-ink-500">
              Detected prospect
            </label>
            <select
              id="reply-prospect"
              value={selectedProspectId}
              onChange={(e) => setSelectedProspectId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink/10 text-[13.5px] text-ink focus:outline-none focus:border-ink/25"
            >
              <option value="">(none, generic reply)</option>
              {prospects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.business}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-2">
            <span className="eyebrow text-ink-500">Pattern matched</span>
            <span
              className={
                matched
                  ? "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium leading-5 bg-[#FBE8DD] text-[#8A3B2A] ring-1 ring-[#EFCFC7]"
                  : "inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-medium leading-5 bg-[#F4EEE4] text-[#6B6B67] ring-1 ring-[#E8DFD0]"
              }
            >
              {matched ? matched.label : "none yet"}
            </span>
          </div>
        </section>

        {/* RIGHT: Drafted response */}
        <section className="ed-card flex flex-col gap-4">
          <div className="font-display text-[18px] tracking-tight text-ink">
            Drafted response
          </div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={14}
            placeholder="Type or pick a pattern below,"
            className="w-full px-3 py-2.5 rounded-lg bg-white border border-ink/10 text-[13.5px] text-ink placeholder:text-ink-400 focus:outline-none focus:border-ink/25 leading-relaxed resize-y"
          />

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={sendViaOutlook}
              className="inline-flex items-center gap-2 rounded-full bg-ember text-paper px-4 py-2 text-[13px] font-medium hover:bg-ember-deep transition-colors"
            >
              <Send className="w-3.5 h-3.5" /> Send via Outlook
            </button>
            <button
              type="button"
              onClick={copyDraft}
              className="inline-flex items-center gap-2 rounded-full bg-white text-ink px-4 py-2 text-[13px] font-medium border border-ink/10 hover:border-ink/25 transition-colors"
            >
              <CopyIcon className="w-3.5 h-3.5" /> Copy
            </button>
            <button
              type="button"
              onClick={saveAsTemplate}
              className="inline-flex items-center gap-2 rounded-full bg-white text-ink px-4 py-2 text-[13px] font-medium border border-ink/10 hover:border-ink/25 transition-colors"
            >
              <Save className="w-3.5 h-3.5" /> Save as template
            </button>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <span className="eyebrow text-ink-500">Pattern responses</span>
            <div className="flex flex-wrap gap-1.5">
              {REPLY_PATTERNS.map((p) => {
                const active = matchedPatternId === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => applyPattern(p.id)}
                    className={
                      active
                        ? "inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-medium bg-ink text-paper border border-ink"
                        : "inline-flex items-center rounded-full px-3 py-1.5 text-[12px] font-medium bg-white text-ink border border-ink/10 hover:border-ink/30 transition-colors"
                    }
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {toast ? (
        <div
          role="status"
          className={
            toast.tone === "success"
              ? "fixed bottom-6 right-6 z-50 rounded-full px-4 py-2 text-[12.5px] font-medium bg-[#E5F1E9] text-[#1F7A3A] ring-1 ring-[#CDE3D5]"
              : "fixed bottom-6 right-6 z-50 rounded-full px-4 py-2 text-[12.5px] font-medium bg-[#FAEFD8] text-[#B8770E] ring-1 ring-[#EFDDB6]"
          }
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  );
}
