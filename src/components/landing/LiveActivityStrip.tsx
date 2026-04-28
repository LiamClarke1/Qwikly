"use client";

import { useState, useEffect } from "react";

interface ActivityItem {
  id: string;
  emoji: string;
  text: string;
}

export function LiveActivityStrip() {
  const [items, setItems] = useState<ActivityItem[]>([]);

  const fetchActivity = async () => {
    try {
      const res = await fetch("/api/stats/activity");
      if (!res.ok) return;
      const data = await res.json();
      if (data.items?.length > 0) {
        setItems(data.items);
      }
    } catch {
      // silent fail — strip just doesn't show
    }
  };

  useEffect(() => {
    fetchActivity();
    const id = setInterval(fetchActivity, 30000);
    return () => clearInterval(id);
  }, []);

  if (items.length === 0) return null;

  const doubled = [...items, ...items];

  return (
    <section className="relative py-6 bg-paper-deep grain overflow-hidden border-y border-ink/8">
      <div className="flex items-center gap-4 mb-3 mx-6">
        <span className="inline-flex items-center gap-2 eyebrow text-ink-500">
          <span className="w-2 h-2 rounded-full bg-ember tick" />
          Live bookings
        </span>
        <div className="flex-1 h-px bg-ink/10" />
      </div>

      <div className="overflow-hidden ticker-pause">
        <div className="flex items-center gap-8 ticker-scroll w-max px-6">
          {doubled.map((item, i) => (
            <div
              key={`${item.id}-${i}`}
              className="flex items-center gap-2.5 whitespace-nowrap"
            >
              <span className="text-base">{item.emoji}</span>
              <span className="text-sm text-ink-700">{item.text}</span>
              <span className="text-ember font-display mx-4">·</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
