"use client";

export const dynamic = "force-dynamic";

import { useState, FormEvent } from "react";
import { AlertTriangle, Download, Trash2, Check, AlertCircle, X as XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";

type Toast = { msg: string; tone: "success" | "danger" };

export default function DangerZonePage() {
  const router = useRouter();
  const [toast, setToast] = useState<Toast | null>(null);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportDone, setExportDone] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const show = (msg: string, tone: "success" | "danger" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 3000);
  };

  const requestExport = async () => {
    setExportLoading(true);
    const res = await fetch("/api/settings/export", { method: "POST" });
    setExportLoading(false);
    if (res.ok) {
      const data = await res.json();
      setExportDone(true);
      show(`Export queued — we'll email ${data.email} when it's ready`);
    } else {
      const data = await res.json().catch(() => ({}));
      show(data.error ?? "Failed to queue export", "danger");
    }
  };

  const handleDeleteConfirmed = async () => {
    const res = await fetch("/api/settings/delete-account", { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      show(data.error ?? "Failed to request deletion", "danger");
      return;
    }
    await supabase.auth.signOut();
    router.push("/login?deleted=1");
  };

  return (
    <>
      <PageHeader title="Danger Zone" description="Irreversible or high-impact actions. Proceed carefully." />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 panel-strong px-4 py-2.5 flex items-center gap-2 animate-slide-up">
          {toast.tone === "success" ? <Check className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-danger" />}
          <span className="text-small text-fg">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-6">
        {/* Data export */}
        <Card>
          <CardHeader
            title="Export all data"
            description="Download a complete copy of your account — conversations, contacts, bookings, invoices, and settings."
          />
          <div className="flex items-start gap-4 p-4 rounded-xl bg-surface-input border border-[var(--border)] mb-5">
            <Download className="w-4 h-4 text-fg-muted mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p className="text-small text-fg">What's included</p>
              {[
                "All conversations and messages",
                "Contacts and their full history",
                "Bookings and calendar events",
                "Invoices and payment records",
                "Settings, assistant config, and knowledge base",
              ].map((item) => (
                <p key={item} className="text-tiny text-fg-muted flex items-center gap-2">
                  <Check className="w-3 h-3 text-success shrink-0" /> {item}
                </p>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="secondary"
              loading={exportLoading}
              icon={exportDone ? <Check className="w-4 h-4 text-success" /> : <Download className="w-4 h-4" />}
              onClick={requestExport}
              disabled={exportDone}
            >
              {exportDone ? "Export queued — check your email" : "Export my data"}
            </Button>
            {exportDone && (
              <p className="text-tiny text-fg-muted">Usually ready within a few minutes.</p>
            )}
          </div>
        </Card>

        {/* Delete account */}
        <Card className="border-red-500/20">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4 text-red-500" />
            </div>
            <div>
              <h2 className="text-h2 text-fg">Delete account</h2>
              <p className="text-small text-fg-muted mt-0.5">Permanently delete your account and all associated data.</p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-red-500/5 border border-red-500/20 space-y-2 mb-5">
            <p className="text-small font-semibold text-red-600">Before you delete</p>
            {[
              "Your account enters a 30-day grace period before permanent deletion.",
              "During the grace period you can cancel by contacting support.",
              "After 30 days, all data is permanently erased and cannot be recovered.",
              "Active subscriptions will be cancelled immediately.",
            ].map((w) => (
              <p key={w} className="text-tiny text-red-500/80 flex items-start gap-2">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" /> {w}
              </p>
            ))}
          </div>

          <Button
            variant="danger"
            icon={<Trash2 className="w-4 h-4" />}
            onClick={() => setDeleteOpen(true)}
          >
            Delete my account
          </Button>
        </Card>
      </div>

      {deleteOpen && (
        <DeleteConfirmModal
          onClose={() => setDeleteOpen(false)}
          onConfirmed={handleDeleteConfirmed}
        />
      )}
    </>
  );
}

// ─── Delete confirm modal ─────────────────────────────────────────────────────

function DeleteConfirmModal({ onClose, onConfirmed }: {
  onClose: () => void;
  onConfirmed: () => void;
}) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const CONFIRM_PHRASE = "delete my account";

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (input.toLowerCase() !== CONFIRM_PHRASE) return;
    setLoading(true);
    await onConfirmed();
    setLoading(false);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div className="w-full max-w-md pointer-events-auto animate-slide-up bg-surface-card border border-red-500/30 rounded-[14px] shadow-[var(--shadow-sm)] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <h2 className="text-h2 text-fg">Confirm deletion</h2>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover cursor-pointer">
              <XIcon className="w-4 h-4 text-fg-muted" />
            </button>
          </div>

          <p className="text-small text-fg-muted mb-4">
            Type <strong className="text-fg font-mono">{CONFIRM_PHRASE}</strong> to confirm. Your account will enter a 30-day grace period before permanent deletion.
          </p>

          <form onSubmit={submit} className="space-y-4">
            <Field label={`Type "${CONFIRM_PHRASE}" to confirm`}>
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                autoFocus
                className="border-red-500/30 focus:border-red-500/50"
              />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button
                type="submit"
                variant="danger"
                loading={loading}
                disabled={input.toLowerCase() !== CONFIRM_PHRASE}
                icon={<Trash2 className="w-4 h-4" />}
              >
                Delete account
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
