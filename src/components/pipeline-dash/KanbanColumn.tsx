"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";
import { KanbanCard, type ContextMoveStatus } from "./KanbanCard";
import type { BoardLane, BoardProspect } from "./KanbanBoard";
import type { ProspectStatus } from "@/app/(app)/dashboard/pipeline/board/actions";

interface KanbanColumnProps {
  laneKey: BoardLane;
  title: string;
  sub: string;
  count: number;
  cards: BoardProspect[];
  dimmed: boolean;
  onDropProspect: (prospectId: string) => void;
  onContextMove: (prospectId: string, status: ProspectStatus | ContextMoveStatus) => void;
}

export function KanbanColumn({
  laneKey,
  title,
  sub,
  count,
  cards,
  dimmed,
  onDropProspect,
  onContextMove,
}: KanbanColumnProps) {
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      role="listitem"
      aria-label={`${title} column, ${count} prospects`}
      className={cn(
        "flex-shrink-0 w-[260px] flex flex-col rounded-2xl bg-[#F4EEE4]/60 border border-ink/[0.06]",
        dimmed && "opacity-50",
      )}
      data-lane={laneKey}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!isOver) setIsOver(true);
      }}
      onDragEnter={(e) => {
        e.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={(e) => {
        // Only clear when the cursor leaves the column, not when it crosses a child.
        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
        setIsOver(false);
      }}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        const id = e.dataTransfer.getData("text/prospect-id");
        if (id) onDropProspect(id);
      }}
    >
      <div
        className={cn(
          "px-4 pt-4 pb-3 border-b border-ink/[0.06]",
          isOver && "bg-[#FAEFD8]",
        )}
      >
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="font-display text-[18px] leading-tight tracking-tight text-ink">
            {title}
          </h2>
          <span className="font-mono text-[12px] text-ink-500 tabular-nums">
            {count}
          </span>
        </div>
        <p className="text-[12px] text-ink-500 mt-0.5">{sub}</p>
      </div>

      <div
        className={cn(
          "flex-1 flex flex-col gap-2 p-3 min-h-[200px]",
          isOver && "bg-[#FAEFD8]/50",
        )}
      >
        {cards.length === 0 ? (
          <div className="text-[12px] text-ink-400 italic px-1 py-3">
            Empty
          </div>
        ) : (
          cards.map((p) => (
            <KanbanCard
              key={p.id}
              prospect={p}
              onContextMove={(status) => onContextMove(p.id, status)}
            />
          ))
        )}
      </div>
    </div>
  );
}
