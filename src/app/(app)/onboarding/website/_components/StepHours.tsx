"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientRow } from "@/lib/use-client";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  client: ClientRow;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

type AfterHoursMode = "book_next_available" | "closed_message" | "always_open";

const DAYS = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
  { key: "sat", label: "Saturday" },
  { key: "sun", label: "Sunday" },
];

const DEFAULT_HOURS: Record<string, [string, string] | null> = {
  mon: ["07:00", "18:00"],
  tue: ["07:00", "18:00"],
  wed: ["07:00", "18:00"],
  thu: ["07:00", "18:00"],
  fri: ["07:00", "18:00"],
  sat: ["08:00", "13:00"],
  sun: null,
};

const AFTER_HOURS_OPTIONS: { value: AfterHoursMode; label: string }[] = [
  { value: "book_next_available", label: "Take messages and book the first available slot (recommended)" },
  { value: "closed_message", label: "Tell visitors we're closed and to come back tomorrow" },
  { value: "always_open", label: "Always allow bookings (24/7 service)" },
];

export default function StepHours({ client, onAdvance, onBack }: Props) {
  const [hours, setHours] = useState<Record<string, [string, string] | null>>(
    (client.working_hours as Record<string, [string, string] | null>) ?? DEFAULT_HOURS
  );
  const [afterHours, setAfterHours] = useState<AfterHoursMode>(
    (client.after_hours_mode as AfterHoursMode) ?? "book_next_available"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleDay(key: string) {
    setHours((h) => ({ ...h, [key]: h[key] ? null : ["07:00", "18:00"] }));
  }

  function setTime(key: string, idx: 0 | 1, val: string) {
    setHours((h) => {
      const cur = h[key] ?? ["07:00", "18:00"];
      const next: [string, string] = [cur[0], cur[1]];
      next[idx] = val;
      return { ...h, [key]: next };
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: dbErr } = await supabase.from("clients").update({
      working_hours: hours,
      after_hours_mode: afterHours,
    }).eq("id", client.id);
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    await onAdvance();
  }

  return (
    <div className="pt-10 max-w-xl">
      <h1 className="text-display-1 font-semibold text-fg mb-2">When are you available?</h1>
      <p className="text-fg-muted text-body mb-8">
        Set your working hours. Your digital assistant will only offer booking slots within these times.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Hours grid */}
        <div className="space-y-2 mb-8">
          {DAYS.map(({ key, label }) => (
            <div key={key} className="flex items-center gap-3 p-3 rounded-xl border border-border bg-bg-elevated">
              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggleDay(key)}
                className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer shrink-0 border-0 ${
                  hours[key] ? "bg-brand" : "bg-bg-elevated border border-border"
                }`}
                aria-label={hours[key] ? `${label} on` : `${label} off`}
              >
                <span
                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${
                    hours[key] ? "left-5" : "left-0.5"
                  }`}
                />
              </button>

              <span className="text-fg text-sm w-24 shrink-0">{label}</span>

              {hours[key] ? (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input
                    type="time"
                    value={hours[key]![0]}
                    onChange={(e) => setTime(key, 0, e.target.value)}
                    className="bg-transparent text-fg text-sm border border-border rounded-lg px-2 py-1 cursor-pointer w-28"
                  />
                  <span className="text-fg-muted text-xs">to</span>
                  <input
                    type="time"
                    value={hours[key]![1]}
                    onChange={(e) => setTime(key, 1, e.target.value)}
                    className="bg-transparent text-fg text-sm border border-border rounded-lg px-2 py-1 cursor-pointer w-28"
                  />
                </div>
              ) : (
                <span className="text-fg-muted text-sm">Closed</span>
              )}
            </div>
          ))}
        </div>

        {/* After-hours mode */}
        <div className="mb-8">
          <p className="text-fg font-semibold text-sm mb-3">After-hours behaviour</p>
          <div className="space-y-2">
            {AFTER_HOURS_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-all ${
                  afterHours === value
                    ? "border-brand/40 bg-brand/5"
                    : "border-border bg-bg-elevated hover:border-border/80"
                }`}
              >
                <input
                  type="radio"
                  name="after_hours"
                  value={value}
                  checked={afterHours === value}
                  onChange={() => setAfterHours(value)}
                  className="mt-0.5 accent-brand"
                />
                <span className="text-fg text-sm leading-relaxed">{label}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
          <Button type="submit" disabled={saving} className="flex-1 justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue →"}
          </Button>
        </div>
      </form>
    </div>
  );
}
