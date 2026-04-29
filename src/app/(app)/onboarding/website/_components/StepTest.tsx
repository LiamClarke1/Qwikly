"use client";

import { ClientRow } from "@/lib/use-client";
import { CheckCircle2, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { WidgetPreview } from "./WidgetPreview";

interface Props {
  client: ClientRow;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

export default function StepTest({ client, onAdvance, onBack }: Props) {
  const resolvedGreeting = (client.web_widget_greeting ?? "Hi! I'm {business}'s booking assistant. How can I help?")
    .replace(/\{name\}/g, "Sarah")
    .replace(/\{business\}/g, client.business_name ?? "your business");

  return (
    <div className="pt-10 max-w-2xl">
      <h1 className="text-display-1 font-semibold text-fg mb-2">
        Let&rsquo;s run a test booking.
      </h1>
      <p className="text-fg-muted text-body mb-6">
        This is a preview of what your visitors will see. Test mode — no real bookings are created.
      </p>

      {/* Test flow guide */}
      <div className="p-5 rounded-xl bg-bg-elevated border border-border mb-6">
        <p className="text-fg font-semibold text-sm mb-3">Suggested test flow</p>
        <ol className="space-y-2">
          {[
            "Click the widget launcher in the preview below.",
            "Enter 'Sarah' as a name and any SA mobile number.",
            "Describe a job like a real customer would, e.g. 'My geyser is leaking.'",
            "Pick a time slot when the AI offers one.",
          ].map((step, i) => (
            <li key={i} className="flex gap-3 text-fg-muted text-sm">
              <span className="text-brand font-mono font-bold shrink-0">{i + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
      </div>

      {/* Widget preview */}
      <WidgetPreview
        color={client.web_widget_color ?? "#E85A2C"}
        greeting={resolvedGreeting}
        launcherLabel={client.web_widget_launcher_label ?? "Message us"}
        position={(client.web_widget_position as "bottom-right" | "bottom-left") ?? "bottom-right"}
        businessName={client.business_name ?? "Your Business"}
      />

      {/* Ready state */}
      <div className="mt-6 flex items-start gap-3 p-4 rounded-xl border border-success/30 bg-success/5">
        <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
        <p className="text-fg-muted text-sm">
          Happy with how it looks? Click <strong className="text-fg">Go live</strong> to activate your website assistant.
        </p>
      </div>

      <div className="flex gap-3 mt-6">
        <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
        <Button type="button" onClick={() => onAdvance()} className="flex-1 justify-center gap-2">
          <PartyPopper className="w-4 h-4" />
          Go live!
        </Button>
      </div>
    </div>
  );
}
