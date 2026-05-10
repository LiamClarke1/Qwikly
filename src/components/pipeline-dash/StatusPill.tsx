"use client";

import { cn } from "@/lib/cn";

// Warm cream palette status tones, mirrored from Mission Control.
// Pills stay readable on the cream surface and on hovered ed-card surfaces.
export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

const TONE_STYLES: Record<StatusTone, string> = {
  neutral: "bg-[#F1EADD] text-[#3C3C38] ring-1 ring-[#E8DFD0]",
  info: "bg-[#E2EAF3] text-[#2C5784] ring-1 ring-[#CCD8E8]",
  success: "bg-[#E5F1E9] text-[#1F7A3A] ring-1 ring-[#CDE3D5]",
  warning: "bg-[#FAEFD8] text-[#B8770E] ring-1 ring-[#EFDDB6]",
  danger: "bg-[#F7E2DE] text-[#B33B2E] ring-1 ring-[#EFCFC7]",
  muted: "bg-[#F4EEE4] text-[#6B6B67] ring-1 ring-[#E8DFD0]",
};

export function StatusPill({
  tone = "neutral",
  children,
  className,
}: {
  tone?: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium leading-5 whitespace-nowrap",
        TONE_STYLES[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

// Shared mappers, used across prospects, campaigns, replies.
export function prospectStatusTone(status: string | null | undefined): StatusTone {
  switch ((status || "").toLowerCase()) {
    case "new":
      return "info";
    case "contacted":
      return "neutral";
    case "replied":
      return "warning";
    case "qualified":
      return "success";
    case "booked":
      return "success";
    case "dead":
      return "danger";
    default:
      return "muted";
  }
}

export function campaignStatusTone(status: string | null | undefined): StatusTone {
  switch ((status || "").toLowerCase()) {
    case "draft":
      return "muted";
    case "warming":
      return "warning";
    case "sending":
      return "success";
    case "paused":
      return "neutral";
    case "completed":
      return "info";
    default:
      return "muted";
  }
}

export function replyClassTone(cls: string | null | undefined): StatusTone {
  switch ((cls || "").toLowerCase()) {
    case "interested":
      return "success";
    case "not interested":
    case "not_interested":
      return "danger";
    case "ooo":
      return "warning";
    case "wrong person":
    case "wrong_person":
      return "neutral";
    case "ask later":
    case "ask_later":
      return "info";
    default:
      return "muted";
  }
}
