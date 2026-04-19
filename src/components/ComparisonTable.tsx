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
    qwikly: "30 seconds",
  },
  {
    feature: "After-hours coverage",
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
    feature: "Automated follow-ups",
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
    diyChatbot: "R500-2k/mo",
    qwikly: "8% per booking",
  },
];

const columns = [
  { key: "receptionist" as const, label: "Receptionist" },
  { key: "autoReply" as const, label: "Auto-Reply" },
  { key: "diyChatbot" as const, label: "DIY Chatbot" },
  { key: "qwikly" as const, label: "Qwikly" },
];

function CellContent({ value, isQwikly }: { value: CellValue; isQwikly: boolean }) {
  if (value === "yes") {
    return (
      <div className={`flex items-center justify-center w-6 h-6 rounded-full mx-auto ${isQwikly ? "bg-cta/20" : "bg-green-100"}`}>
        <Check className={`w-4 h-4 ${isQwikly ? "text-cta" : "text-green-600"}`} />
      </div>
    );
  }
  if (value === "no") {
    return (
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-red-50 mx-auto">
        <X className="w-4 h-4 text-red-400" />
      </div>
    );
  }
  if (value === "partial") {
    return (
      <div className="flex items-center justify-center w-6 h-6 rounded-full bg-yellow-50 mx-auto">
        <Minus className="w-4 h-4 text-yellow-500" />
      </div>
    );
  }
  return (
    <span className={`text-sm font-medium ${isQwikly ? "text-cta font-semibold" : "text-foreground"}`}>
      {value}
    </span>
  );
}

export default function ComparisonTable() {
  return (
    <div className="overflow-x-auto -mx-4 sm:mx-0">
      <div className="min-w-[640px] px-4 sm:px-0">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-4 px-4 text-sm font-medium text-muted w-[180px]">
                Feature
              </th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`py-4 px-3 text-center text-sm font-semibold ${
                    col.key === "qwikly"
                      ? "text-cta bg-gradient-to-b from-[#CA8A04]/10 to-transparent"
                      : "text-foreground"
                  }`}
                >
                  <span className={col.key === "qwikly" ? "inline-flex flex-col items-center gap-1" : ""}>
                    {col.key === "qwikly" && (
                      <span className="bg-gradient-to-r from-[#CA8A04] to-[#F59E0B] text-white text-[8px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wide">
                        Recommended
                      </span>
                    )}
                    {col.label}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={row.feature}
                className={`border-t border-border ${i % 2 === 0 ? "bg-white" : "bg-background"}`}
              >
                <td className="py-4 px-4 text-sm font-medium text-foreground">
                  {row.feature}
                </td>
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`py-4 px-3 text-center ${
                      col.key === "qwikly"
                        ? "bg-cta/5 border-l-2 border-r-2 border-cta/20"
                        : ""
                    } ${
                      col.key === "qwikly" && i === 0
                        ? "border-t-2 border-t-cta/20"
                        : ""
                    } ${
                      col.key === "qwikly" && i === rows.length - 1
                        ? "border-b-2 border-b-cta/20"
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
    </div>
  );
}
