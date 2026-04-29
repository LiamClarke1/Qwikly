"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientRow } from "@/lib/use-client";
import { Loader2 } from "lucide-react";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const TRADES = [
  "Electrician", "Plumber", "Roofer", "Solar Installer", "Pest Control",
  "Aircon", "Pool Cleaning", "Landscaper", "Garage Door", "Security",
];

interface Props {
  client: ClientRow;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

export default function StepBusiness({ client, onAdvance }: Props) {
  const [form, setForm] = useState({
    business_name: client.business_name ?? "",
    trade: client.trade ?? "",
    owner_name: client.owner_name ?? "",
    areas: (client.service_areas ?? []).join(", "),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business_name.trim()) { setError("Business name is required."); return; }
    if (!form.trade) { setError("Please select your trade."); return; }
    setSaving(true);
    setError(null);
    const { error: dbErr } = await supabase.from("clients").update({
      business_name: form.business_name.trim(),
      trade: form.trade.toLowerCase(),
      owner_name: form.owner_name.trim() || null,
      service_areas: form.areas.split(",").map((s) => s.trim()).filter(Boolean),
    }).eq("id", client.id);
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    await onAdvance();
  }

  return (
    <div className="pt-10 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">
        Let&rsquo;s get your AI assistant live in about 10 minutes.
      </h1>
      <p className="text-fg-muted text-body mb-8">
        Tell us about your business so we can set up the right assistant for you.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="Business name">
          <Input
            value={form.business_name}
            onChange={(e) => setForm((f) => ({ ...f, business_name: e.target.value }))}
            placeholder="JD Electrical"
          />
        </Field>

        <Field label="Your trade">
          <Select
            value={form.trade}
            onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}
          >
            <option value="">Select your trade…</option>
            {TRADES.map((t) => (
              <option key={t} value={t.toLowerCase()}>{t}</option>
            ))}
          </Select>
        </Field>

        <Field label="Your name">
          <Input
            value={form.owner_name}
            onChange={(e) => setForm((f) => ({ ...f, owner_name: e.target.value }))}
            placeholder="John"
          />
        </Field>

        <Field label="City / service area" hint="Comma-separated, e.g. Johannesburg, Sandton, Midrand">
          <Input
            value={form.areas}
            onChange={(e) => setForm((f) => ({ ...f, areas: e.target.value }))}
            placeholder="Johannesburg, Sandton, Midrand"
          />
        </Field>

        <div className="pt-4">
          <Button type="submit" disabled={saving} className="w-full justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue →"}
          </Button>
        </div>
      </form>
    </div>
  );
}
