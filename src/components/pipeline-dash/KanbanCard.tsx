"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/cn";
import { StatusPill } from "./StatusPill";
import type { BoardProspect } from "./KanbanBoard";
import type { ProspectStatus } from "@/app/(app)/dashboard/pipeline/board/actions";

// Discovery and Demo both correspond to the 'qualified' DB status. The board
// disambiguates them visually via the latest pipeline_meetings row, so the
// context menu exposes two synthetic statuses that the board translates into
// the right combination of status + meetingStatus.
export type ContextMoveStatus = "qualified-discovery" | "qualified-demo";
export type AnyMoveStatus = ProspectStatus | ContextMoveStatus;

interface KanbanCardProps {
  prospect: BoardProspect;
  onContextMove: (status: AnyMoveStatus) => void;
}

interface MenuItem {
  label: string;
  status: AnyMoveStatus;
  tone?: "danger";
}

const MENU: ReadonlyArray<MenuItem> = [
  { label: "Move to Cold", status: "new" },
  { label: "Move to Contacted", status: "contacted" },
  { label: "Move to Replied", status: "replied" },
  { label: "Move to Discovery", status: "qualified-discovery" },
  { label: "Move to Demo", status: "qualified-demo" },
  { label: "Move to Signed", status: "booked" },
  { label: "Mark dead", status: "dead", tone: "danger" },
];

export function KanbanCard({ prospect, onContextMove }: KanbanCardProps) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ x: number; y: number } | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Close the context menu on outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    const onDocClick = (e: MouseEvent) => {
      if (!menuRef.current) return;
      if (!menuRef.current.contains(e.target as Node)) setMenu(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenu(null);
    };
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  const isHot = (prospect.score ?? 0) >= 9;

  return (
    <>
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.effectAllowed = "move";
          e.dataTransfer.setData("text/prospect-id", prospect.id);
        }}
        onClick={() => router.push(`/dashboard/pipeline/prospects/${prospect.id}`)}
        onContextMenu={(e) => {
          e.preventDefault();
          setMenu({ x: e.clientX, y: e.clientY });
        }}
        className={cn(
          "ed-card !p-3 cursor-grab active:cursor-grabbing select-none",
          "hover:border-ink/15 hover:shadow-sm transition-colors",
          "flex flex-col gap-1.5",
        )}
        aria-label={`Prospect ${prospect.displayName}, right-click for status menu`}
      >
        <div className="flex items-start justify-between gap-2">
          <p className="text-[13.5px] font-medium text-ink leading-tight truncate">
            {prospect.displayName}
          </p>
          {isHot ? (
            <StatusPill tone="danger" className="shrink-0">
              HOT
            </StatusPill>
          ) : null}
        </div>
        {(prospect.industry || prospect.city) ? (
          <p className="text-[12px] text-ink-500 truncate">
            {[prospect.industry, prospect.city].filter(Boolean).join(", ")}
          </p>
        ) : null}
      </div>

      {menu ? (
        <div
          ref={menuRef}
          role="menu"
          style={{ top: menu.y, left: menu.x }}
          className="fixed z-50 min-w-[180px] bg-paper rounded-lg border border-ink/[0.08] shadow-md py-1"
          onClick={(e) => e.stopPropagation()}
        >
          {MENU.map((item) => (
            <button
              key={item.status}
              type="button"
              role="menuitem"
              onClick={() => {
                onContextMove(item.status);
                setMenu(null);
              }}
              className={cn(
                "w-full text-left px-3 py-1.5 text-[13px] hover:bg-[#F4EEE4]",
                item.tone === "danger" ? "text-[#B33B2E]" : "text-ink",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}
    </>
  );
}
