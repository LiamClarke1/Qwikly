import { Check, X, Minus } from "lucide-react";

type CellKind = "yes" | "no" | "partial" | "text";

interface Cell {
  kind: CellKind;
  label?: string;
  estimate?: boolean;
}

interface Row {
  capability: string;
  qwikly: Cell;
  tidio: Cell;
  intercom: Cell;
  fiverr: Cell;
  receptionist: Cell;
}

const yes = (label?: string): Cell => ({ kind: "yes", label });
const no = (): Cell => ({ kind: "no" });
const partial = (label?: string): Cell => ({ kind: "partial", label });
const text = (label: string, estimate = false): Cell => ({ kind: "text", label, estimate });

const rows: Row[] = [
  {
    capability: "Monthly cost",
    qwikly: text("R699 to R7,999"),
    tidio: text("R350 to R700", true),
    intercom: text("R1,400+", true),
    fiverr: text("R200 to R400 once-off"),
    receptionist: text("R5,000 to R8,000", true),
  },
  {
    capability: "Captures leads 24/7",
    qwikly: yes(),
    tidio: yes(),
    intercom: yes(),
    fiverr: yes(),
    receptionist: partial("Limited hours"),
  },
  {
    capability: "Pings owner in under 60s",
    qwikly: yes("WhatsApp + SMS"),
    tidio: no(),
    intercom: no(),
    fiverr: no(),
    receptionist: no(),
  },
  {
    capability: "Books jobs onto a calendar",
    qwikly: yes(),
    tidio: no(),
    intercom: partial("Manual"),
    fiverr: no(),
    receptionist: yes(),
  },
  {
    capability: "POPIA compliant, hosted in SA",
    qwikly: yes(),
    tidio: no(),
    intercom: no(),
    fiverr: partial("Depends"),
    receptionist: yes(),
  },
  {
    capability: "ZAR billing, no FX",
    qwikly: yes(),
    tidio: no(),
    intercom: no(),
    fiverr: partial("Depends"),
    receptionist: yes(),
  },
  {
    capability: "Outcome guarantee",
    qwikly: yes("30 days"),
    tidio: no(),
    intercom: no(),
    fiverr: no(),
    receptionist: no(),
  },
  {
    capability: "Pay only when a job is booked",
    qwikly: text("Optional, R350 / job"),
    tidio: no(),
    intercom: no(),
    fiverr: no(),
    receptionist: no(),
  },
  {
    capability: "Live in 24 hours",
    qwikly: yes(),
    tidio: text("Self-serve"),
    intercom: text("Self-serve"),
    fiverr: text("1 to 2 days"),
    receptionist: text("1 to 4 weeks"),
  },
];

const columns = [
  { key: "qwikly" as const, label: "Qwikly", isQwikly: true },
  { key: "tidio" as const, label: "Tidio Starter", isQwikly: false },
  { key: "intercom" as const, label: "Intercom Essential", isQwikly: false },
  { key: "fiverr" as const, label: "Fiverr build", isQwikly: false },
  { key: "receptionist" as const, label: "Part-time receptionist", isQwikly: false },
];

function CellContent({ cell, isQwikly }: { cell: Cell; isQwikly: boolean }) {
  if (cell.kind === "yes") {
    return (
      <span className="flex flex-col items-center gap-1.5">
        <span
          className={`flex items-center justify-center w-6 h-6 rounded-full ${
            isQwikly ? "bg-ember/15" : "bg-green-500/10"
          }`}
        >
          <Check
            className={`w-3.5 h-3.5 ${isQwikly ? "text-ember" : "text-green-600"}`}
            strokeWidth={2.5}
            aria-hidden
          />
        </span>
        {cell.label && (
          <span className={`text-[11px] leading-tight ${isQwikly ? "text-ember" : "text-ink-600"}`}>
            {cell.label}
          </span>
        )}
      </span>
    );
  }
  if (cell.kind === "no") {
    return (
      <span className="flex items-center justify-center">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-ink/[0.04]">
          <X className="w-3.5 h-3.5 text-ink/30" strokeWidth={2.5} aria-hidden />
        </span>
      </span>
    );
  }
  if (cell.kind === "partial") {
    return (
      <span className="flex flex-col items-center gap-1.5">
        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-500/10">
          <Minus className="w-3.5 h-3.5 text-yellow-600" strokeWidth={2.5} aria-hidden />
        </span>
        {cell.label && (
          <span className="text-[11px] leading-tight text-ink-600">{cell.label}</span>
        )}
      </span>
    );
  }
  return (
    <span className="flex flex-col items-center gap-1">
      <span
        className={`text-xs sm:text-sm font-medium leading-tight text-center ${
          isQwikly ? "text-ember" : "text-ink"
        }`}
      >
        {cell.label}
      </span>
      {cell.estimate && (
        <span className="eyebrow text-[8px] tracking-widest text-ink-400">industry estimate</span>
      )}
    </span>
  );
}

export default function CompareTable() {
  return (
    <div className="w-full">
      {/* Mobile, sticky first column */}
      <div className="sm:hidden overflow-x-auto -mx-6 px-6">
        <table className="border-collapse min-w-[640px]">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="sticky left-0 z-10 bg-paper text-left pb-4 pr-4 pl-0 eyebrow text-ink-500 w-[45%] min-w-[160px]">
                Capability
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`pb-4 px-3 text-center font-normal min-w-[120px] ${
                    col.isQwikly
                      ? "bg-ember/[0.06] border-x border-ember/20"
                      : ""
                  }`}
                >
                  <span className={`eyebrow ${col.isQwikly ? "text-ember" : "text-ink-500"}`}>
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.06]">
            {rows.map((row, i) => (
              <tr key={row.capability}>
                <td className="sticky left-0 z-10 bg-paper py-4 pr-4 pl-0 text-sm text-ink-700 leading-snug align-middle">
                  {row.capability}
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-4 px-3 text-center align-middle ${
                      col.isQwikly
                        ? `bg-ember/[0.06] border-x border-ember/20 ${
                            i === rows.length - 1 ? "border-b border-b-ember/20" : ""
                          }`
                        : ""
                    }`}
                  >
                    <CellContent cell={row[col.key]} isQwikly={col.isQwikly} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Desktop */}
      <div className="hidden sm:block">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="text-left pb-5 pr-6 eyebrow text-ink-500 w-[28%]">
                Capability
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`pb-5 px-3 text-center font-normal ${
                    col.isQwikly
                      ? "bg-ember/[0.06] border-x border-ember/20 rounded-t-lg"
                      : ""
                  }`}
                >
                  <span className={`eyebrow ${col.isQwikly ? "text-ember" : "text-ink-500"}`}>
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-ink/[0.06]">
            {rows.map((row, i) => (
              <tr key={row.capability} className="hover:bg-ink/[0.015] transition-colors">
                <td className="py-5 pr-6 text-sm text-ink-700 leading-snug align-middle">
                  {row.capability}
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-5 px-3 text-center align-middle ${
                      col.isQwikly
                        ? `bg-ember/[0.06] border-x border-ember/20 ${
                            i === rows.length - 1 ? "border-b border-b-ember/20" : ""
                          }`
                        : ""
                    }`}
                  >
                    <CellContent cell={row[col.key]} isQwikly={col.isQwikly} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-6 text-xs text-ink-400 leading-relaxed">
        All competitor prices marked &ldquo;industry estimate&rdquo; are public list prices or typical SA market rates,
        converted to ZAR where relevant, and may vary by plan, region, and exchange rate at the time of billing.
      </p>
    </div>
  );
}
