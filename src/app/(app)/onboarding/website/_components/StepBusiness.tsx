"use client";

import { useState } from "react";
import { ClientRow } from "@/lib/use-client";
import { Loader2 } from "lucide-react";
import { Input, Select, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { type PlanTier } from "@/lib/plan";
import { saveBusinessStep } from "../actions";

const INDUSTRIES = [
  "Restaurant / Café",
  "Hair & Beauty Salon",
  "Gym / Fitness Studio",
  "Medical / Dental Clinic",
  "Contractor / Trades",
  "Electrician",
  "Plumber",
  "Landscaper",
  "Cleaning Service",
  "Pest Control",
  "Pool Care",
  "Solar Installer",
  "Aircon & HVAC",
  "Security",
  "Coffee Shop",
  "Retail",
  "Accountant / Bookkeeper",
  "Legal Practice",
  "Real Estate Agency",
  "Marketing Agency",
  "Other",
];

interface Props {
  client: ClientRow;
  plan: PlanTier;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

export default function StepBusiness({ client, onAdvance }: Props) {
  const storedIndustry = client.industry ?? "";
  const isOtherIndustry = storedIndustry !== "" && !INDUSTRIES.includes(storedIndustry);

  const [form, setForm] = useState({
    business_name: client.business_name ?? "",
    industry: isOtherIndustry ? "Other" : storedIndustry,
    support_email: client.support_email ?? client.notification_email ?? "",
    contact_phone: client.notification_phone ?? "",
  });
  const [otherIndustry, setOtherIndustry] = useState(isOtherIndustry ? storedIndustry : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.business_name.trim()) {
      setError("Business name is required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const industryValue = form.industry === "Other" ? (otherIndustry.trim() || "Other") : (form.industry || null);
      await saveBusinessStep({
        business_name: form.business_name.trim(),
        industry: industryValue,
        support_email: form.support_email.trim() || null,
        notification_email: form.support_email.trim() || null,
        notification_phone: form.contact_phone.trim() || null,
      });
      await onAdvance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pt-10 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">
        Tell us about your business.
      </h1>
      <p className="text-fg-muted text-body mb-8">
        This gets your widget talking in the right way from day one. Everything can be changed later in Settings.
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
            placeholder="Acme Plumbing"
            required
          />
        </Field>

        <Field label="Industry" hint="Helps us set smart defaults for your qualifying questions.">
          <Select
            value={form.industry}
            onChange={(e) => {
              const val = e.target.value;
              setForm((f) => ({ ...f, industry: val }));
              if (val !== "Other") setOtherIndustry("");
            }}
          >
            <option value="">Select your industry…</option>
            {INDUSTRIES.map((ind) => (
              <option key={ind} value={ind}>{ind}</option>
            ))}
          </Select>
          {form.industry === "Other" && (
            <input
              type="text"
              value={otherIndustry}
              placeholder="Please describe your industry…"
              className="mt-2 w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#E85A2C] focus:border-[#E85A2C] transition-colors duration-200"
              onChange={(e) => setOtherIndustry(e.target.value)}
            />
          )}
        </Field>

        <Field label="Contact email" hint="Leads will be delivered here.">
          <Input
            type="email"
            value={form.support_email}
            onChange={(e) => setForm((f) => ({ ...f, support_email: e.target.value }))}
            placeholder="you@example.com"
          />
        </Field>

        <Field label="Contact phone" hint="Optional — shown to visitors who want to call instead.">
          <Input
            type="tel"
            value={form.contact_phone}
            onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
            placeholder="+27 82 000 0000"
          />
        </Field>

        <div className="pt-4">
          <Button type="submit" disabled={saving} className="w-full justify-center">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & continue →"}
          </Button>
        </div>
      </form>
    </div>
  );
}
