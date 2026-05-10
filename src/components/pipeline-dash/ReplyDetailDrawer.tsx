"use client";

import { useEffect } from "react";
import { X, Send, Ban, Clock, UserCheck } from "lucide-react";
import { StatusPill, replyClassTone } from "./StatusPill";

export interface ReplyDetail {
  id: string;
  prospect_name: string | null;
  prospect_company: string | null;
  prospect_email: string | null;
  classification: string | null;
  received_at: string | null;
  thread?: Array<{
    id: string;
    direction: "outbound" | "inbound";
    subject: string | null;
    body: string | null;
    at: string;
  }>;
}

export function ReplyDetailDrawer({
  reply,
  onClose,
  onAction,
}: {
  reply: ReplyDetail | null;
  onClose: () => void;
  onAction?: (action: "send_booking" | "not_interested" | "snooze_7" | "hand_to_me", reply: ReplyDetail) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (reply) {
      document.addEventListener("keydown", onKey);
      return () => document.removeEventListener("keydown", onKey);
    }
  }, [reply, onClose]);

  if (!reply) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="flex-1 bg-ink/30 backdrop-blur-[1px] animate-fade-in"
      />
      <aside
        className="w-full max-w-[560px] h-full bg-paper border-l border-ink/[0.08] shadow-pop overflow-y-auto animate-slide-in-right"
        role="dialog"
        aria-label="Reply detail"
      >
        <div className="flex items-start justify-between gap-3 px-6 pt-6 pb-4 border-b border-ink/[0.08]">
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="eyebrow text-ink-500">Reply</div>
            <h2 className="font-display text-[24px] leading-[1.15] tracking-tight text-ink truncate">
              {reply.prospect_name || "Unknown sender"}
            </h2>
            <div className="flex items-center gap-2 flex-wrap">
              {reply.classification ? (
                <StatusPill tone={replyClassTone(reply.classification)}>
                  {reply.classification.replace(/_/g, " ").toLowerCase()}
                </StatusPill>
              ) : null}
              {reply.prospect_company ? (
                <span className="text-[12px] text-ink-500">
                  {reply.prospect_company}
                </span>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-ink/[0.06] text-ink-500"
            aria-label="Close drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <div className="eyebrow text-ink-500">Actions</div>
            <div className="grid grid-cols-2 gap-2">
              <ActionButton
                label="Send booking link"
                icon={<Send className="w-3.5 h-3.5" />}
                onClick={() => onAction?.("send_booking", reply)}
              />
              <ActionButton
                label="Mark not interested"
                icon={<Ban className="w-3.5 h-3.5" />}
                onClick={() => onAction?.("not_interested", reply)}
              />
              <ActionButton
                label="Snooze 7 days"
                icon={<Clock className="w-3.5 h-3.5" />}
                onClick={() => onAction?.("snooze_7", reply)}
              />
              <ActionButton
                label="Hand to me"
                icon={<UserCheck className="w-3.5 h-3.5" />}
                onClick={() => onAction?.("hand_to_me", reply)}
              />
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <div className="eyebrow text-ink-500">Thread</div>
            {reply.thread && reply.thread.length > 0 ? (
              <ul className="flex flex-col gap-3">
                {reply.thread.map((m) => (
                  <li
                    key={m.id}
                    className="ed-card !p-4 !rounded-lg flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between gap-2 text-[12px] text-ink-500 font-mono">
                      <span>
                        {m.direction === "outbound" ? "You sent" : "They replied"}
                      </span>
                      <span>{new Date(m.at).toLocaleString()}</span>
                    </div>
                    {m.subject ? (
                      <div className="text-[13.5px] font-medium text-ink">
                        {m.subject}
                      </div>
                    ) : null}
                    <div className="text-[13px] text-ink leading-relaxed whitespace-pre-wrap">
                      {m.body || "(no body)"}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[13px] text-ink-500">
                Thread will appear once messages are linked to this reply.
              </p>
            )}
          </section>
        </div>
      </aside>
    </div>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center justify-center gap-2 rounded-lg border border-ink/10 bg-white px-3 py-2.5 text-[13px] font-medium text-ink hover:bg-[#F9F6F2] hover:border-ink/20 transition-colors"
    >
      {icon}
      {label}
    </button>
  );
}
