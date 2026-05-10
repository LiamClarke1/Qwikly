"use client";

import { cn } from "@/lib/cn";
import { StatusPill, replyClassTone } from "./StatusPill";
import { timeAgo } from "@/lib/format";

export interface ReplyRowData {
  id: string;
  prospect_name: string | null;
  prospect_company: string | null;
  snippet: string | null;
  classification: string | null;
  received_at: string | null;
  read?: boolean | null;
}

export function ReplyRow({
  reply,
  active,
  onClick,
}: {
  reply: ReplyRowData;
  active?: boolean;
  onClick: () => void;
}) {
  const snippet = (reply.snippet || "").slice(0, 90);
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full text-left flex flex-col gap-1.5 px-4 py-3.5 border-b border-ink/[0.06] transition-colors",
        active ? "bg-[#F9F6F2]" : "bg-transparent hover:bg-[#F9F6F2]"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          {!reply.read ? (
            <span
              aria-hidden
              className="w-1.5 h-1.5 rounded-full bg-ember shrink-0"
            />
          ) : null}
          <span className="text-[13.5px] font-medium text-ink truncate">
            {reply.prospect_name || "Unknown sender"}
          </span>
          {reply.prospect_company ? (
            <span className="text-[12.5px] text-ink-500 truncate">
              , {reply.prospect_company}
            </span>
          ) : null}
        </div>
        <span className="text-[11.5px] font-mono text-ink-500 shrink-0">
          {reply.received_at ? timeAgo(reply.received_at) : ""}
        </span>
      </div>
      <div className="flex items-start gap-2">
        <div className="text-[13px] text-ink-500 leading-relaxed flex-1 line-clamp-1">
          {snippet || "(no preview available)"}
        </div>
        {reply.classification ? (
          <StatusPill tone={replyClassTone(reply.classification)}>
            {reply.classification.replace(/_/g, " ").toLowerCase()}
          </StatusPill>
        ) : null}
      </div>
    </button>
  );
}
