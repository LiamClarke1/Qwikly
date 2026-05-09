"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Settings, Check, Pencil, X, AlertCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import { fmt, fmtDate } from "@/lib/money";

interface PlanRow {
  id: string;
  plan_key: string;
  display_name: string;
  amount_zar_cents: number;
  billing_cadence: "monthly" | "annual";
  is_active: boolean;
  updated_at: string;
}

interface DraftRow {
  display_name: string;
  amount_zar: string;
  billing_cadence: "monthly" | "annual";
  is_active: boolean;
}

interface PendingChange {
  plan: PlanRow;
  draft: DraftRow;
  newAmountZar: number;
}

function ConfirmModal({
  pending, onConfirm, onCancel, saving,
}: {
  pending: PendingChange;
  onConfirm: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const oldZar = pending.plan.amount_zar_cents / 100;
  const oldName = pending.plan.display_name;
  const newName = pending.draft.display_name;
  const oldCadence = pending.plan.billing_cadence;
  const newCadence = pending.draft.billing_cadence;
  const oldActive = pending.plan.is_active;
  const newActive = pending.draft.is_active;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-200">
        <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-5 h-5 text-amber-600" />
        </div>
        <h3 className="text-[16px] font-bold text-slate-900 mb-1">
          Update {oldName} plan?
        </h3>
        <p className="text-[13px] text-slate-500 leading-relaxed mb-4">
          Confirm the changes below. New prices apply immediately to draft invoices and the pipeline forecast.
        </p>

        <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 mb-5">
          {oldName !== newName && (
            <Row label="Display name" oldVal={oldName} newVal={newName} />
          )}
          {oldZar !== pending.newAmountZar && (
            <Row
              label="Price"
              oldVal={fmt(oldZar)}
              newVal={fmt(pending.newAmountZar)}
            />
          )}
          {oldCadence !== newCadence && (
            <Row label="Billing cadence" oldVal={oldCadence} newVal={newCadence} />
          )}
          {oldActive !== newActive && (
            <Row
              label="Active"
              oldVal={oldActive ? "Yes" : "No"}
              newVal={newActive ? "Yes" : "No"}
            />
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            disabled={saving}
            className="px-4 py-2 rounded-xl border border-slate-200 text-[13px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer transition-colors disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={saving}
            className="px-4 py-2 rounded-xl bg-[#E85A2C] hover:bg-[#d04f25] text-white text-[13px] font-semibold cursor-pointer transition-colors disabled:opacity-60"
          >
            {saving ? "Saving..." : "Confirm and save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, oldVal, newVal }: { label: string; oldVal: string; newVal: string }) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
      <span className="text-slate-500">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-slate-400 line-through">{oldVal}</span>
        <span className="text-slate-300">to</span>
        <span className="text-slate-900 font-semibold">{newVal}</span>
      </span>
    </div>
  );
}

function isValidAmount(raw: string): boolean {
  if (raw.trim() === "") return false;
  if (!/^\d+(\.\d{1,2})?$/.test(raw.trim())) return false;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0;
}

export default function AdminPlanPricesPage() {
  const [plans, setPlans] = useState<PlanRow[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);

  function load() {
    setLoading(true);
    fetch("/api/admin/settings/plan-prices")
      .then(r => r.ok ? r.json() : { plans: [] })
      .then(d => {
        const rows: PlanRow[] = d.plans ?? [];
        setPlans(rows);
        const initialDrafts: Record<string, DraftRow> = {};
        for (const p of rows) {
          initialDrafts[p.id] = {
            display_name: p.display_name,
            amount_zar: (p.amount_zar_cents / 100).toFixed(2),
            billing_cadence: p.billing_cadence,
            is_active: p.is_active,
          };
        }
        setDrafts(initialDrafts);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load plans, please refresh.");
        setLoading(false);
      });
  }

  useEffect(() => { load(); }, []);

  function startEdit(id: string) {
    setEditingId(id);
    setError(null);
  }

  function cancelEdit(id: string) {
    const original = plans.find(p => p.id === id);
    if (original) {
      setDrafts(d => ({
        ...d,
        [id]: {
          display_name: original.display_name,
          amount_zar: (original.amount_zar_cents / 100).toFixed(2),
          billing_cadence: original.billing_cadence,
          is_active: original.is_active,
        },
      }));
    }
    setEditingId(null);
    setError(null);
  }

  function updateDraft(id: string, patch: Partial<DraftRow>) {
    setDrafts(d => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  function requestSave(plan: PlanRow) {
    setError(null);
    const draft = drafts[plan.id];
    if (!draft) return;

    if (!draft.display_name.trim()) {
      setError("Display name is required.");
      return;
    }
    if (!isValidAmount(draft.amount_zar)) {
      setError("Price must be a positive number with at most 2 decimal places.");
      return;
    }

    const newAmountZar = Number(draft.amount_zar);

    const noChange =
      draft.display_name === plan.display_name &&
      newAmountZar === plan.amount_zar_cents / 100 &&
      draft.billing_cadence === plan.billing_cadence &&
      draft.is_active === plan.is_active;

    if (noChange) {
      setEditingId(null);
      return;
    }

    setPending({ plan, draft, newAmountZar });
  }

  async function commitSave() {
    if (!pending) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/settings/plan-prices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: pending.plan.id,
          display_name: pending.draft.display_name.trim(),
          amount_zar: pending.newAmountZar,
          billing_cadence: pending.draft.billing_cadence,
          is_active: pending.draft.is_active,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(typeof body.error === "string" ? body.error : "Save failed, please try again.");
        setSaving(false);
        return;
      }
      setSaving(false);
      setPending(null);
      setEditingId(null);
      setFlash(`${pending.plan.display_name} updated.`);
      load();
    } catch {
      setError("Save failed, please try again.");
      setSaving(false);
    }
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <p className="text-[13px] text-[#E85A2C] font-medium mb-1">Admin · Settings</p>
          <h1 className="text-[28px] font-bold leading-tight text-slate-900">Plan prices</h1>
          <p className="text-[13px] text-slate-500 mt-1 max-w-2xl">
            Edit Qwikly subscription pricing. These values are the fallback when a client has no explicit MRR set, and drive pipeline forecasts and draft invoice amounts.
          </p>
        </div>
      </div>

      {flash && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-emerald-700 flex items-center gap-2">
            <Check className="w-4 h-4" />
            {flash}
          </p>
          <button onClick={() => setFlash(null)} className="text-[12px] text-emerald-600 hover:text-emerald-800 font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </p>
          <button onClick={() => setError(null)} className="text-[12px] text-red-600 hover:text-red-800 font-medium cursor-pointer">
            Dismiss
          </button>
        </div>
      )}

      {loading ? (
        <div className="text-[13px] text-slate-500 py-8 text-center">Loading…</div>
      ) : plans.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-10 flex flex-col items-center gap-3 shadow-sm">
          <Settings className="w-8 h-8 text-slate-300" />
          <p className="text-[13px] text-slate-500">No plan prices found. Run the migration to seed the table.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div className="hidden md:grid grid-cols-[1.4fr_1fr_1fr_0.7fr_1fr_auto] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 text-[11px] uppercase tracking-wide font-semibold text-slate-500">
            <div>Plan</div>
            <div>Display name</div>
            <div>Price (ZAR)</div>
            <div>Cadence</div>
            <div>Last updated</div>
            <div className="text-right">Actions</div>
          </div>

          <div className="divide-y divide-slate-100">
            {plans.map(plan => {
              const draft = drafts[plan.id];
              const editing = editingId === plan.id;
              if (!draft) return null;
              return (
                <div
                  key={plan.id}
                  className="grid md:grid-cols-[1.4fr_1fr_1fr_0.7fr_1fr_auto] gap-4 px-5 py-4 items-center"
                >
                  <div>
                    <p className="text-[13px] font-semibold text-slate-800">{plan.plan_key}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border",
                          draft.is_active
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-500 border-slate-200"
                        )}
                      >
                        {draft.is_active ? "Active" : "Inactive"}
                      </span>
                    </div>
                  </div>

                  <div>
                    {editing ? (
                      <input
                        type="text"
                        value={draft.display_name}
                        onChange={e => updateDraft(plan.id, { display_name: e.target.value })}
                        className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl focus:outline-none focus:border-[#E85A2C] focus:ring-1 focus:ring-[#E85A2C]/20"
                      />
                    ) : (
                      <p className="text-[13px] text-slate-800">{plan.display_name}</p>
                    )}
                  </div>

                  <div>
                    {editing ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[13px] text-slate-500">R</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={draft.amount_zar}
                          onChange={e => updateDraft(plan.id, { amount_zar: e.target.value })}
                          placeholder="0.00"
                          className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl focus:outline-none focus:border-[#E85A2C] focus:ring-1 focus:ring-[#E85A2C]/20"
                        />
                      </div>
                    ) : (
                      <p className="text-[13px] font-medium text-slate-800">{fmt(plan.amount_zar_cents / 100)}</p>
                    )}
                  </div>

                  <div>
                    {editing ? (
                      <select
                        value={draft.billing_cadence}
                        onChange={e =>
                          updateDraft(plan.id, { billing_cadence: e.target.value as "monthly" | "annual" })
                        }
                        className="w-full px-3 py-2 text-[13px] border border-slate-200 rounded-xl focus:outline-none focus:border-[#E85A2C] focus:ring-1 focus:ring-[#E85A2C]/20 bg-white cursor-pointer"
                      >
                        <option value="monthly">Monthly</option>
                        <option value="annual">Annual</option>
                      </select>
                    ) : (
                      <p className="text-[13px] text-slate-600 capitalize">{plan.billing_cadence}</p>
                    )}
                  </div>

                  <div>
                    <p className="text-[12px] text-slate-500">{fmtDate(plan.updated_at)}</p>
                  </div>

                  <div className="flex md:justify-end gap-2">
                    {editing ? (
                      <>
                        <label className="inline-flex items-center gap-2 text-[12px] text-slate-600 cursor-pointer mr-2">
                          <input
                            type="checkbox"
                            checked={draft.is_active}
                            onChange={e => updateDraft(plan.id, { is_active: e.target.checked })}
                            className="w-3.5 h-3.5 rounded border-slate-300 text-[#E85A2C] focus:ring-[#E85A2C]/30 cursor-pointer"
                          />
                          Active
                        </label>
                        <button
                          onClick={() => cancelEdit(plan.id)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </button>
                        <button
                          onClick={() => requestSave(plan)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#E85A2C] text-white text-[12px] font-semibold hover:bg-[#d04f25] cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Save
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => startEdit(plan.id)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 text-[12px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Edit
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {pending && (
        <ConfirmModal
          pending={pending}
          onConfirm={commitSave}
          onCancel={() => { if (!saving) setPending(null); }}
          saving={saving}
        />
      )}
    </div>
  );
}
