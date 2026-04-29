"use client";

interface WidgetPreviewProps {
  color?: string;
  greeting?: string;
  launcherLabel?: string;
  position?: "bottom-right" | "bottom-left";
  businessName?: string;
}

export function WidgetPreview({
  color = "#E85A2C",
  greeting = "Hi! How can I help you today?",
  launcherLabel = "Message us",
  position = "bottom-right",
  businessName = "Your Business",
}: WidgetPreviewProps) {
  const isRight = position !== "bottom-left";

  return (
    <div className="relative w-full h-80 bg-bg-elevated rounded-2xl overflow-hidden border border-border select-none">
      {/* Simulated site content */}
      <div className="absolute inset-0 p-6 pointer-events-none">
        <div className="h-3 w-28 bg-border rounded mb-3 opacity-60" />
        <div className="h-2 w-full bg-border rounded mb-2 opacity-40" />
        <div className="h-2 w-4/5 bg-border rounded mb-2 opacity-40" />
        <div className="h-2 w-3/5 bg-border rounded opacity-40" />
      </div>

      {/* Chat window — appears above launcher */}
      <div
        className={`absolute bottom-14 ${isRight ? "right-4" : "left-4"} w-52 rounded-2xl shadow-xl overflow-hidden bg-white`}
      >
        <div
          className="px-4 py-3 text-white text-xs font-semibold"
          style={{ background: color }}
        >
          {businessName}
        </div>
        <div className="p-3 bg-gray-50">
          <div className="bg-white rounded-2xl rounded-tl-sm px-3 py-2 text-xs text-gray-800 shadow-sm leading-relaxed">
            {greeting}
          </div>
        </div>
      </div>

      {/* Launcher pill */}
      <button
        className="absolute bottom-4 flex items-center gap-2 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-lg cursor-pointer border-0"
        style={{
          background: color,
          [isRight ? "right" : "left"]: "16px",
        }}
      >
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" />
        {launcherLabel}
      </button>
    </div>
  );
}
