"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientRow } from "@/lib/use-client";
import { Loader2 } from "lucide-react";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WidgetPreview } from "./WidgetPreview";

interface Props {
  client: ClientRow;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

const TRADE_GREETINGS: Record<string, string> = {
  electrician: "Hi {name}! I'm {business}'s booking assistant. Sparky problem, fault, or install job?",
  plumber: "Hi {name}! I'm {business}'s booking assistant. Burst pipe, leak, or install?",
  roofer: "Hi {name}! I'm {business}'s booking assistant. Got a leak or need a quote?",
  "solar installer": "Hi {name}! I'm {business}'s booking assistant. Interested in solar or having issues?",
  "pest control": "Hi {name}! I'm {business}'s booking assistant. What pest problem can we sort out?",
  aircon: "Hi {name}! I'm {business}'s booking assistant. Aircon fault, service, or new install?",
  "pool cleaning": "Hi {name}! I'm {business}'s booking assistant. Pool maintenance or emergency?",
  landscaper: "Hi {name}! I'm {business}'s booking assistant. What can we help you with today?",
  "garage door": "Hi {name}! I'm {business}'s booking assistant. Garage door issue or new install?",
  security: "Hi {name}! I'm {business}'s booking assistant. Security issue or new installation?",
};

export default function StepCustomise({ client, onAdvance, onBack }: Props) {
  const defaultGreeting =
    TRADE_GREETINGS[client.trade?.toLowerCase() ?? ""] ??
    `Hi {name}! I'm {business}'s booking assistant. How can I help?`;

  const [color, setColor] = useState(client.web_widget_color ?? "#E85A2C");
  const [greeting, setGreeting] = useState(client.web_widget_greeting ?? defaultGreeting);
  const [label, setLabel] = useState(client.web_widget_launcher_label ?? "Message us");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">(
    (client.web_widget_position as "bottom-right" | "bottom-left") ?? "bottom-right"
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resolvedGreeting = greeting
    .replace(/\{name\}/g, "Sarah")
    .replace(/\{business\}/g, client.business_name ?? "your business");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const { error: dbErr } = await supabase.from("clients").update({
      web_widget_color: color,
      web_widget_greeting: greeting,
      web_widget_launcher_label: label,
      web_widget_position: position,
    }).eq("id", client.id);
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    await onAdvance();
  }

  return (
    <div className="pt-10">
      <h1 className="text-display-1 font-semibold text-fg mb-2">Make it look like yours.</h1>
      <p className="text-fg-muted text-body mb-8">
        Customise how visitors see your assistant. The preview updates live.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <form onSubmit={handleSubmit} className="space-y-5">
          <Field label="Accent colour">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 font-mono uppercase"
                placeholder="#E85A2C"
                maxLength={7}
              />
            </div>
          </Field>

          <Field label="Greeting message" hint='Use {name} to personalise. Use {business} for your business name.'>
            <Textarea
              value={greeting}
              onChange={(e) => setGreeting(e.target.value)}
              rows={3}
              placeholder="Hi {name}! How can I help?"
            />
          </Field>

          <Field label="Launcher button text">
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Message us"
            />
          </Field>

          <Field label="Widget position">
            <div className="flex gap-3">
              {(["bottom-right", "bottom-left"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPosition(p)}
                  className={`flex-1 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                    position === p
                      ? "border-brand bg-brand/10 text-brand"
                      : "border-border text-fg-muted hover:border-fg-muted"
                  }`}
                >
                  {p === "bottom-right" ? "Bottom right" : "Bottom left"}
                </button>
              ))}
            </div>
          </Field>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
            <Button type="submit" disabled={saving} className="flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue →"}
            </Button>
          </div>
        </form>

        <div className="md:sticky md:top-6">
          <p className="text-fg-subtle text-xs font-semibold uppercase tracking-wider mb-3">
            Live preview
          </p>
          <WidgetPreview
            color={color}
            greeting={resolvedGreeting}
            launcherLabel={label}
            position={position}
            businessName={client.business_name ?? "Your Business"}
          />
        </div>
      </div>
    </div>
  );
}
