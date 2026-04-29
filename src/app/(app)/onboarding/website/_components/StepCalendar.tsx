"use client";

import { useState } from "react";
import { ClientRow } from "@/lib/use-client";
import { Calendar, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  client: ClientRow;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

export default function StepCalendar({ client, onAdvance, onBack }: Props) {
  const [skipping, setSkipping] = useState(false);
  const isConnected = !!client.google_calendar_id;

  function connectCalendar() {
    window.location.href = `/api/calendar/connect?return=${encodeURIComponent("/onboarding/website")}`;
  }

  async function handleSkip() {
    setSkipping(true);
    await onAdvance();
  }

  return (
    <div className="pt-10 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">Where should bookings go?</h1>
      <p className="text-fg-muted text-body mb-8">
        Connect your Google Calendar so your digital assistant can offer real available slots and confirm bookings automatically.
      </p>

      {isConnected ? (
        <div className="flex items-start gap-3 p-4 rounded-xl border border-success/30 bg-success/5 mb-6">
          <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
          <div>
            <p className="text-fg font-semibold text-sm">Google Calendar connected</p>
            <p className="text-fg-muted text-xs mt-0.5">{client.google_calendar_id}</p>
          </div>
        </div>
      ) : (
        <>
          <button
            onClick={connectCalendar}
            className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-border bg-bg-elevated hover:bg-bg-elevated/80 transition-colors cursor-pointer mb-4"
          >
            <Calendar className="w-5 h-5 text-brand" />
            <span className="font-semibold text-fg">Connect Google Calendar</span>
          </button>

          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-warning/5 border border-warning/20 mb-6">
            <AlertTriangle className="w-4 h-4 text-warning mt-0.5 shrink-0" />
            <p className="text-fg-muted text-sm">
              Your digital assistant won&rsquo;t be able to book jobs until you connect a calendar.
              You can complete this step later in Settings.
            </p>
          </div>
        </>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
        {isConnected ? (
          <Button type="button" onClick={() => onAdvance()} className="flex-1 justify-center">
            Continue →
          </Button>
        ) : (
          <Button
            type="button"
            variant="secondary"
            onClick={handleSkip}
            disabled={skipping}
            className="flex-1 justify-center"
          >
            Connect later — skip for now
          </Button>
        )}
      </div>
    </div>
  );
}
