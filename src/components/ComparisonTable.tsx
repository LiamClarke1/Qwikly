import { Check, X, Minus } from "lucide-react";

type CellValue = "yes" | "no" | "partial" | string;

interface ComparisonRow {
  feature: string;
  receptionist: CellValue;
  autoReply: CellValue;
  diyChatbot: CellValue;
  qwikly: CellValue;
}

const rows: ComparisonRow[] = [
  {
    feature: "Response time",
    receptionist: "2-5 min",
    autoReply: "Instant",
    diyChatbot: "Instant",
    qwikly: "30 sec",
  },
  {
    feature: "After-hours",
    receptionist: "no",
    autoReply: "yes",
    diyChatbot: "yes",
    qwikly: "yes",
  },
  {
    feature: "Lead qualification",
    receptionist: "partial",
    autoReply: "no",
    diyChatbot: "partial",
    qwikly: "yes",
  },
  {
    feature: "Appointment booking",
    receptionist: "yes",
    autoReply: "no",
    diyChatbot: "no",
    qwikly: "yes",
  },
  {
    feature: "Auto follow-ups",
    receptionist: "no",
    autoReply: "no",
    diyChatbot: "no",
    qwikly: "yes",
  },
  {
    feature: "No-show recovery",
    receptionist: "no",
    autoReply: "no",
    diyChatbot: "no",
    qwikly: "yes",
  },
  {
    feature: "Email handling",
    receptionist: "partial",
    autoReply: "no",
    diyChatbot: "no",
    qwikly: "yes",
  },
  {
    feature: "Cost",
    receptionist: "R8-15k/mo",
    autoReply: "Free",
    diyChatbot: "R500-2k",
    qwikly: "From R399/mo",
  },
];

const columns = [
  { key: "receptionist" as const, label: "Receptionist", mobileLabel: "Recpt." },
  { key: "autoReply" as const,    label: "Auto-Reply",   mobileLabel: "Auto"   },
  { key: "diyChatbot" as const,   label: "DIY Chatbot",  mobileLabel: "DIY"    },
  { key: "qwikly" as const,       label: "Qwikly",       mobileLabel: "Qwikly" },
];

function CellContent({ value, isQwikly }: { value: CellValue; isQwikly: boolean }) {
  if (value === "yes") {
    return (
      <div className={`flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full mx-auto ${isQwikly ? "bg-accent/20" : "bg-green-100"}`}>
        <Check className={`w-3 h-3 sm:w-4 sm:h-4 ${isQwikly ? "text-accent" : "text-green-600"}`} />
      </div>
    );
  }
  if (value === "no") {
    return (
      <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-red-50 mx-auto">
        <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="flex items-center justify-center w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-yellow-50 mx-auto">
        <Minus className="w-3 h-3 sm:w-4 sm:h-4 text-yellow-500" />
      </div>
    );
  }
  return (
    <span className={`text-[10px] sm:text-sm font-medium leading-tight ${isQwikly ? "text-accent font-semibold" : "text-text-dark"}`}>
      {value}
    </span>
  );
}

export default function ComparisonTable() {
  return (
    <div className="w-full">
      <table className="w-full border-collapse table-fixed">
        <thead>
          <tr>
            <th className="text-left py-3 sm:py-4 px-2 sm:px-4 text-[11px] sm:text-sm font-medium text-text-muted-dark w-[28%] sm:w-[180px]">
              Feature
            </th>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`py-3 sm:py-4 px-1 sm:px-3 text-center text-[11px] sm:text-sm font-semibold ${
                  col.key === "qwikly"
                    ? "text-accent bg-gradient-to-b from-accent/10 to-transparent"
                    : "text-text-dark"
                }`}
              >
                <span className={col.key === "qwikly" ? "inline-flex flex-col items-center gap-1" : ""}>
                  {col.key === "qwikly" && (
                    <span className="bg-gradient-to-r from-accent to-accent-hover text-white text-[7px] sm:text-[8px] px-1.5 sm:px-2 py-0.5 rounded-full font-bold uppercase tracking-wide whitespace-nowrap">
                      Best
                    </span>
                  )}
                  <span className="sm:hidden">{col.mobileLabel}</span>
                  <span className="hidden sm:inline">{col.label}</span>
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.feature}
              className={`border-t border-border-light ${i % 2 === 0 ? "bg-white" : "bg-bg-subtle"}`}
            >
              <td className="py-3 sm:py-4 px-2 sm:px-4 text-[11px] sm:text-sm font-medium text-text-dark leading-tight">
                {row.feature}
              </td>
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={`py-3 sm:py-4 px-1 sm:px-3 text-center ${
                    col.key === "qwikly"
                      ? "bg-accent/5 border-l-2 border-r-2 border-accent/20"
                      : ""
                  } ${
                    col.key === "qwikly" && i === 0
                      ? "border-t-2 border-t-accent/20"
                      : ""
                  } ${
                    col.key === "qwikly" && i === rows.length - 1
                      ? "border-b-2 border-b-accent/20"
                      : ""
                  }`}
                >
                  <CellContent value={row[col.key]} isQwikly={col.key === "qwikly"} />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
