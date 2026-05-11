// Server-safe tone helpers, importable from both server and client components.
// The visual StatusPill component lives in StatusPill.tsx as "use client";
// these mapping functions are pure and have no React boundary, so they belong
// in a plain module that any caller can use.

export type StatusTone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "muted";

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
