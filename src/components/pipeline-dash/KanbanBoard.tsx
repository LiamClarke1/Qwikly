"use client";

// Six-column kanban for the Pipeline board. HTML5 drag-and-drop only, no
// external libraries.
//
// Status mapping note:
//   The pipeline_prospects.status enum is new, contacted, replied, qualified,
//   booked, dead. We split 'qualified' into two visual columns using the
//   latest pipeline_meetings row for the prospect, computed server-side:
//     Discovery = qualified AND latest meeting status = 'booked'
//     Demo      = qualified AND latest meeting status = 'held'
//     If a qualified prospect has no meeting, it falls into Discovery by
//     default. This is a deliberate simplification, see KanbanBoard mapping.
//   Right-clicking "Move to Demo" promotes a 'qualified' prospect to the
//   Demo column visually, persisted by creating or updating the meeting
//   record separately (out of scope for this lane). For now the status enum
//   remains 'qualified' and the visual lane is governed by meetingStatus.

import { useMemo, useState } from "react";
import { KanbanColumn } from "./KanbanColumn";
import {
  setProspectStatus,
  type ProspectStatus,
} from "@/app/(app)/dashboard/pipeline/board/actions";

export type BoardLane =
  | "cold"
  | "contacted"
  | "replied"
  | "discovery"
  | "demo"
  | "signed";

export interface BoardProspect {
  id: string;
  displayName: string;
  industry: string | null;
  city: string | null;
  score: number | null;
  status: ProspectStatus;
  meetingStatus: "booked" | "held" | null;
}

interface LaneDef {
  key: BoardLane;
  title: string;
  sub: string;
  status: ProspectStatus;
}

// Lane definitions, in display order. Copy is verbatim per spec.
const LANES: ReadonlyArray<LaneDef> = [
  { key: "cold", title: "Cold", sub: "Not yet touched", status: "new" },
  { key: "contacted", title: "Contacted", sub: "Sent first message", status: "contacted" },
  { key: "replied", title: "Replied", sub: "Need a response", status: "replied" },
  { key: "discovery", title: "Discovery", sub: "Call scheduled", status: "qualified" },
  { key: "demo", title: "Demo", sub: "Showing the product", status: "qualified" },
  { key: "signed", title: "Signed", sub: "Founding customer", status: "booked" },
];

function laneForProspect(p: BoardProspect): BoardLane {
  switch (p.status) {
    case "new":
      return "cold";
    case "contacted":
      return "contacted";
    case "replied":
      return "replied";
    case "qualified":
      return p.meetingStatus === "held" ? "demo" : "discovery";
    case "booked":
      return "signed";
    case "dead":
      // Dead prospects are hidden from the board lanes by default.
      return "cold";
    default:
      return "cold";
  }
}

export function KanbanBoard({
  prospects,
  sprintMode,
}: {
  prospects: BoardProspect[];
  sprintMode: boolean;
}) {
  // Optimistic local copy of prospects so the column counts update the moment
  // a card is dropped. We reconcile with the server action result.
  const [local, setLocal] = useState<BoardProspect[]>(prospects);

  // Hide 'dead' prospects from the board entirely.
  const visible = useMemo(
    () => local.filter((p) => p.status !== "dead"),
    [local],
  );

  const grouped = useMemo(() => {
    const map: Record<BoardLane, BoardProspect[]> = {
      cold: [],
      contacted: [],
      replied: [],
      discovery: [],
      demo: [],
      signed: [],
    };
    for (const p of visible) {
      map[laneForProspect(p)].push(p);
    }
    return map;
  }, [visible]);

  // Sprint mode visual filter: only show top 10 cold, dim other columns.
  const sprintFilteredCold = useMemo(() => {
    if (!sprintMode) return grouped.cold;
    return grouped.cold.slice(0, 10);
  }, [sprintMode, grouped.cold]);

  async function handleMove(prospectId: string, newStatus: ProspectStatus) {
    // Optimistic update: change the local copy immediately.
    setLocal((prev) =>
      prev.map((p) =>
        p.id === prospectId
          ? {
              ...p,
              status: newStatus,
              // When moving manually into Demo, reflect that visually by
              // marking meetingStatus 'held'. Moving to Discovery clears it.
              meetingStatus:
                newStatus === "qualified" ? p.meetingStatus : null,
            }
          : p,
      ),
    );

    const result = await setProspectStatus(prospectId, newStatus);
    if (!result.ok) {
      // Roll back on failure.
      setLocal(prospects);
    }
  }

  // Demo lane shim: dragging a qualified card into Demo should bump it visually
  // even though the underlying status stays 'qualified'. We expose a helper.
  async function handleDropToLane(prospectId: string, lane: BoardLane) {
    const target = LANES.find((l) => l.key === lane);
    if (!target) return;

    if (lane === "demo") {
      // Move status to qualified and mark meetingStatus 'held' locally so the
      // card lands in the Demo column.
      setLocal((prev) =>
        prev.map((p) =>
          p.id === prospectId
            ? { ...p, status: "qualified", meetingStatus: "held" }
            : p,
        ),
      );
      const res = await setProspectStatus(prospectId, "qualified");
      if (!res.ok) setLocal(prospects);
      return;
    }

    if (lane === "discovery") {
      setLocal((prev) =>
        prev.map((p) =>
          p.id === prospectId
            ? { ...p, status: "qualified", meetingStatus: "booked" }
            : p,
        ),
      );
      const res = await setProspectStatus(prospectId, "qualified");
      if (!res.ok) setLocal(prospects);
      return;
    }

    await handleMove(prospectId, target.status);
  }

  return (
    <div
      className="flex gap-4 overflow-x-auto pb-4"
      role="list"
      aria-label="Pipeline kanban columns"
    >
      {LANES.map((lane, idx) => {
        const cards =
          lane.key === "cold" && sprintMode
            ? sprintFilteredCold
            : grouped[lane.key];
        // Sprint mode dims columns 2 to 6 (index 1 onwards).
        const dimmed = sprintMode && idx > 0;

        return (
          <KanbanColumn
            key={lane.key}
            laneKey={lane.key}
            title={lane.title}
            sub={lane.sub}
            count={cards.length}
            cards={cards}
            dimmed={dimmed}
            onDropProspect={(id) => {
              void handleDropToLane(id, lane.key);
            }}
            onContextMove={(id, status) => {
              if (status === "qualified-discovery") {
                void handleDropToLane(id, "discovery");
              } else if (status === "qualified-demo") {
                void handleDropToLane(id, "demo");
              } else {
                void handleMove(id, status);
              }
            }}
          />
        );
      })}
    </div>
  );
}
