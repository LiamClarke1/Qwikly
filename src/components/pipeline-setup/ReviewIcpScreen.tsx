"use client";
import { useState } from "react";
import type { EnrichedIcp, FieldProvenance } from "@/lib/pipeline/enrichment/types";
import type { IcpDefinition } from "@/lib/pipeline/setup-state";
import { WhyTooltip } from "./WhyTooltip";

interface Props {
  enriched: EnrichedIcp;
  onSave: (icp: IcpDefinition) => Promise<void>;
}

export function ReviewIcpScreen({ enriched, onSave }: Props) {
  const [icp, setIcp] = useState<IcpDefinition>(enriched.icp);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      await onSave(icp);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
      setSaving(false);
    }
  }

  function updateList(
    field: "industries" | "titles" | "locations" | "intentSignals",
    value: string,
  ) {
    setIcp((prev) => ({
      ...prev,
      [field]: value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    }));
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6">
      <header>
        <h1 className="font-display text-3xl text-ink-900">Here&apos;s what we built for you</h1>
        <p className="text-ink-600 mt-2">
          Every field is editable. Click &ldquo;Why?&rdquo; next to any field to see where the suggestion came from.
        </p>
      </header>

      {enriched.warnings.length > 0 && (
        <div className="rounded-md bg-amber-50 border border-amber-200 p-4 text-small text-amber-900">
          <ul className="list-disc list-inside space-y-1">
            {enriched.warnings.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-5">
        <Field label="Offer" provenance={enriched.provenance.offer}>
          <textarea
            value={icp.offer}
            onChange={(e) => setIcp({ ...icp, offer: e.target.value })}
            rows={2}
            className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>

        <Field label="Industries to target" provenance={enriched.provenance.industries}>
          <input
            type="text"
            value={icp.industries.join(", ")}
            onChange={(e) => updateList("industries", e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>

        <Field label="Job titles to reach" provenance={enriched.provenance.titles}>
          <input
            type="text"
            value={icp.titles.join(", ")}
            onChange={(e) => updateList("titles", e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>

        <Field label="Company size band" provenance={enriched.provenance.sizeMin}>
          <div className="flex gap-3 items-center mt-1">
            <input
              type="number"
              value={icp.sizeMin}
              onChange={(e) => setIcp({ ...icp, sizeMin: Number(e.target.value) })}
              className="w-24 rounded-md border border-ink-300 px-3 py-2"
            />
            <span className="text-ink-500">to</span>
            <input
              type="number"
              value={icp.sizeMax}
              onChange={(e) => setIcp({ ...icp, sizeMax: Number(e.target.value) })}
              className="w-24 rounded-md border border-ink-300 px-3 py-2"
            />
            <span className="text-ink-500">employees</span>
          </div>
        </Field>

        <Field label="Locations" provenance={enriched.provenance.locations}>
          <input
            type="text"
            value={icp.locations.join(", ")}
            onChange={(e) => updateList("locations", e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>

        <Field label="Intent signals" provenance={enriched.provenance.intentSignals}>
          <input
            type="text"
            value={icp.intentSignals.join(", ")}
            onChange={(e) => updateList("intentSignals", e.target.value)}
            className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>

        <Field label="Typical deal value (ZAR)" provenance={enriched.provenance.dealValueZar}>
          <input
            type="number"
            value={icp.dealValueZar}
            onChange={(e) => setIcp({ ...icp, dealValueZar: Number(e.target.value) })}
            className="mt-1 w-32 rounded-md border border-ink-300 px-3 py-2"
          />
        </Field>
      </div>

      {error && <p className="text-red-600 text-small">{error}</p>}

      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="w-full rounded-md bg-ember px-4 py-3 text-white font-medium hover:bg-ember/90 disabled:opacity-60 cursor-pointer disabled:cursor-not-allowed"
      >
        {saving ? "Saving and generating your first 5 prospects..." : "Save and generate my first 5 prospects"}
      </button>
    </div>
  );
}

function Field({
  label,
  provenance,
  children,
}: {
  label: string;
  provenance: FieldProvenance | undefined;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center">
        <span className="text-small font-medium text-ink-800">{label}</span>
        <WhyTooltip provenance={provenance} />
      </div>
      {children}
    </div>
  );
}
