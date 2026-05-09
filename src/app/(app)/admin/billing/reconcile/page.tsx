"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Upload, CheckCircle2, AlertTriangle, FileQuestion, Copy, Play } from "lucide-react";
import { cn } from "@/lib/cn";
import { formatZAR } from "@/lib/format";

type MatchStatus = "matched" | "amount_mismatch" | "no_invoice" | "duplicate";
interface MatchRow {
  bank: { date: string | null; description: string; reference: string; amount_zar: number };
  invoice_id: string | null;
  invoice_number: string | null;
  invoice_total_zar: number | null;
  match_status: MatchStatus;
  notes: string | null;
}
interface PreviewResult {
  ok: true;
  filename: string;
  matches: MatchRow[];
  total_rows: number;
  matched_rows: number;
  unmatched_rows: number;
  total_amount_zar: number;
  matched_amount_zar: number;
}

const STATUS_CFG: Record<MatchStatus, { label: string; cls: string; icon: React.ElementType }> = {
  matched:          { label: "Matched",          cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  amount_mismatch:  { label: "Amount mismatch",  cls: "bg-amber-50 text-amber-700 border-amber-200",       icon: AlertTriangle },
  no_invoice:       { label: "No invoice",       cls: "bg-slate-50 text-slate-600 border-slate-200",       icon: FileQuestion },
  duplicate:        { label: "Duplicate",        cls: "bg-violet-50 text-violet-700 border-violet-200",    icon: Copy },
};

export default function BankReconcilePage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<{ run_id: string; matched_rows: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function runPreview() {
    if (!file) return;
    setPreviewing(true);
    setError(null);
    setApplied(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/admin/billing/reconcile", { method: "POST", body: fd });
    setPreviewing(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error ?? "Preview failed.");
      return;
    }
    const data = await r.json();
    setPreview(data);
  }

  async function apply() {
    if (!file || !preview) return;
    setApplying(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/admin/billing/reconcile", { method: "PATCH", body: fd });
    setApplying(false);
    if (!r.ok) {
      const j = await r.json().catch(() => ({}));
      setError(j.error ?? "Apply failed.");
      return;
    }
    const data = await r.json();
    setApplied({ run_id: data.run_id, matched_rows: data.matched_rows });
    setPreview(null);
    setFile(null);
  }

  return (
    <div>
      <Link href="/admin/billing/pipeline" className="inline-flex items-center gap-1 text-[12px] text-slate-500 hover:text-slate-800 mb-3">
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to Pipeline
      </Link>

      <div className="mb-6">
        <p className="text-[13px] text-[#E85A2C] font-medium mb-1">Admin / Billing</p>
        <h1 className="text-[28px] font-bold text-slate-900 leading-tight">Bank reconciliation</h1>
        <p className="text-[13px] text-slate-500 mt-1 max-w-2xl">
          Upload a CSV from your bank to match deposits against outstanding Qwikly invoices. Matched rows auto-flip to paid. Unmatched rows are flagged for manual review.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="text-[12px] text-red-600 hover:text-red-800 font-medium cursor-pointer">Dismiss</button>
        </div>
      )}

      {applied && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3 mb-4 flex items-center justify-between gap-3">
          <p className="text-[13px] text-emerald-700">
            Reconciliation applied. {applied.matched_rows} invoice{applied.matched_rows === 1 ? "" : "s"} marked paid. Run id <code className="text-[11px] bg-emerald-100 px-1 py-0.5 rounded">{applied.run_id.slice(0,8)}</code>.
          </p>
          <Link href="/admin/billing/pipeline" className="text-[12px] text-emerald-700 hover:text-emerald-900 font-medium">View Pipeline</Link>
        </div>
      )}

      {!preview && (
        <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-[#E85A2C]/10 flex items-center justify-center shrink-0">
              <Upload className="w-5 h-5 text-[#E85A2C]" />
            </div>
            <div className="flex-1">
              <p className="text-[14px] font-semibold text-slate-800 mb-1">Step 1, choose your bank statement CSV</p>
              <p className="text-[12px] text-slate-500 mb-4">
                Most major SA bank exports work, the parser auto-detects date / description / reference / amount columns. Max 10 MB.
              </p>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={e => setFile(e.target.files?.[0] ?? null)}
                className="block w-full text-[13px] text-slate-700 file:mr-3 file:rounded-xl file:border-0 file:bg-slate-100 file:text-slate-700 file:px-3 file:py-2 file:cursor-pointer file:text-[13px] file:font-medium hover:file:bg-slate-200"
              />
              {file && (
                <p className="text-[12px] text-slate-500 mt-2">
                  Selected, <span className="font-medium text-slate-800">{file.name}</span> ({(file.size / 1024).toFixed(0)} KB).
                </p>
              )}
              <button
                onClick={runPreview}
                disabled={!file || previewing}
                className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E85A2C] text-white text-[13px] font-semibold hover:bg-[#d04f25] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
              >
                <Play className="w-3.5 h-3.5" />
                {previewing ? "Previewing..." : "Preview matches"}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <SummaryCard label="Total deposits" value={String(preview.total_rows)} sub={formatZAR(preview.total_amount_zar)} />
            <SummaryCard label="Matched" value={String(preview.matched_rows)} sub={formatZAR(preview.matched_amount_zar)} accent="text-emerald-600" />
            <SummaryCard label="Unmatched" value={String(preview.unmatched_rows)} accent="text-amber-600" />
            <SummaryCard label="File" value={preview.filename} />
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-4">
            <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 grid grid-cols-[100px_1fr_120px_120px_120px_180px] gap-3 text-[11px] uppercase tracking-widest text-slate-400 font-semibold">
              <span>Date</span>
              <span>Description</span>
              <span>Reference</span>
              <span className="text-right">Bank R</span>
              <span className="text-right">Invoice R</span>
              <span>Status</span>
            </div>
            {preview.matches.length === 0 ? (
              <p className="px-5 py-8 text-center text-[13px] text-slate-500">No deposit rows in the file.</p>
            ) : preview.matches.map((m, i) => {
              const cfg = STATUS_CFG[m.match_status];
              const Icon = cfg.icon;
              return (
                <div key={i} className={cn("px-5 py-3 grid grid-cols-[100px_1fr_120px_120px_120px_180px] gap-3 items-center", i > 0 && "border-t border-slate-100")}>
                  <p className="text-[12px] text-slate-500">{m.bank.date ?? "—"}</p>
                  <p className="text-[12px] text-slate-700 truncate">{m.bank.description}</p>
                  <p className="text-[11px] text-slate-500 font-mono truncate">{m.bank.reference || "—"}</p>
                  <p className="text-[12px] text-slate-700 text-right tabular-nums">{formatZAR(m.bank.amount_zar)}</p>
                  <p className="text-[12px] text-slate-500 text-right tabular-nums">{m.invoice_total_zar !== null ? formatZAR(m.invoice_total_zar) : "—"}</p>
                  <div>
                    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border", cfg.cls)}>
                      <Icon className="w-3 h-3" />
                      {cfg.label}
                    </span>
                    {m.notes && <p className="text-[10px] text-slate-400 mt-0.5">{m.notes}</p>}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => { setPreview(null); }}
              className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-[13px] font-medium hover:bg-slate-50 cursor-pointer"
            >
              Cancel
            </button>
            <button
              onClick={apply}
              disabled={applying || preview.matched_rows === 0}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-white text-[13px] font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {applying ? "Applying..." : `Apply ${preview.matched_rows} matched invoices`}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4">
      <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1">{label}</p>
      <p className={cn("text-[20px] font-bold leading-none truncate", accent ?? "text-slate-800")}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500 mt-1">{sub}</p>}
    </div>
  );
}
