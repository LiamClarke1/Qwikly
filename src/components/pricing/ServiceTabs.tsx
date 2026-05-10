"use client";

export type ServiceTab = "digital-assistant" | "pipeline";

export function ServiceTabs({
  active,
  onChange,
}: {
  active: ServiceTab;
  onChange: (tab: ServiceTab) => void;
}) {
  const tabs: { id: ServiceTab; label: string; sub: string }[] = [
    { id: "digital-assistant", label: "Digital Assistant", sub: "Inbound, R699 to R7,999/mo" },
    { id: "pipeline", label: "Pipeline", sub: "Outbound, R7,500 + R7,500 to R15,000/mo" },
  ];

  function handleClick(id: ServiceTab) {
    onChange(id);
    if (typeof window !== "undefined") {
      const el = document.getElementById(id);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }
  }

  return (
    <div className="flex justify-center">
      <div
        role="tablist"
        aria-label="Choose a service"
        className="inline-flex items-stretch p-1.5 rounded-full bg-ink/[0.04] border border-ink/10 gap-1 max-w-full overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => handleClick(tab.id)}
              className={`group relative flex flex-col items-center justify-center px-5 sm:px-7 py-2.5 rounded-full whitespace-nowrap transition-all duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ember/40 ${
                isActive
                  ? "bg-ember text-paper shadow-sm"
                  : "text-ink-700 hover:text-ink"
              }`}
            >
              <span
                className={`eyebrow text-[10px] sm:text-[11px] tracking-widest ${
                  isActive ? "text-paper" : "text-ink"
                }`}
              >
                {tab.label}
              </span>
              <span
                className={`text-[10px] sm:text-[11px] mt-0.5 leading-none ${
                  isActive ? "text-paper/80" : "text-ink-500"
                }`}
              >
                {tab.sub}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default ServiceTabs;
