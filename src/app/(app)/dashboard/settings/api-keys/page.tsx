"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, FormEvent } from "react";
import {
  Check, AlertCircle, Plus, Copy, RotateCcw, Trash2, X as XIcon, Key, CheckCheck, AlertTriangle,
} from "lucide-react";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
}

const ALL_SCOPES = [
  { id: "conversations:read",  label: "Conversations — Read" },
  { id: "conversations:write", label: "Conversations — Write" },
  { id: "contacts:read",       label: "Contacts — Read" },
  { id: "analytics:read",      label: "Analytics — Read" },
];

type Toast = { msg: string; tone: "success" | "danger" };
type PendingAction = { type: "revoke" | "rotate"; key: ApiKey };

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKey, setNewKey] = useState<{ name: string; full_key: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const show = (msg: string, tone: "success" | "danger" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/settings/api-keys");
    if (res.ok) setKeys(await res.json());
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const copyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const confirmRevoke = async (k: ApiKey) => {
    setActionLoading(true);
    const res = await fetch(`/api/settings/api-keys/${k.id}`, { method: "DELETE" });
    setActionLoading(false);
    setPendingAction(null);
    if (res.ok) { setKeys((prev) => prev.filter((x) => x.id !== k.id)); show("Key revoked"); }
    else show("Failed to revoke", "danger");
  };

  const confirmRotate = async (k: ApiKey) => {
    setActionLoading(true);
    const res = await fetch(`/api/settings/api-keys/${k.id}`, { method: "PATCH" });
    setActionLoading(false);
    setPendingAction(null);
    if (!res.ok) { show("Failed to rotate", "danger"); return; }
    const data = await res.json();
    setKeys((prev) => prev.map((x) => x.id === k.id ? { ...x, key_prefix: data.key_prefix } : x));
    setNewKey({ name: k.name, full_key: data.full_key });
    show("Key rotated — copy it now, it won't be shown again");
  };

  return (
    <>
      <PageHeader
        title="API Keys"
        description="Create keys to integrate external tools with your Qwikly data."
        actions={
          <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
            New key
          </Button>
        }
      />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 panel-strong px-4 py-2.5 flex items-center gap-2 animate-slide-up">
          {toast.tone === "success" ? <Check className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-danger" />}
          <span className="text-small text-fg">{toast.msg}</span>
        </div>
      )}

      {/* Usage guide */}
      <Card className="mb-6">
        <CardHeader title="Authentication" description="Pass your key in the Authorization header." />
        <div className="rounded-xl bg-surface-input border border-[var(--border)] px-4 py-3 font-mono text-tiny text-fg-muted overflow-x-auto">
          <span className="text-ember">Authorization</span>
          {": Bearer qw_live_…"}
        </div>
        <p className="text-tiny text-fg-muted mt-3">
          Base URL: <span className="font-mono text-fg">https://app.qwikly.co.za/api/v1</span>
        </p>
      </Card>

      {/* Key list */}
      <Card>
        <CardHeader title="Your keys" />
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-surface-input" />)}
          </div>
        ) : keys.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-input border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <Key className="w-5 h-5 text-fg-muted" />
            </div>
            <p className="text-body font-semibold text-fg mb-1">No API keys yet</p>
            <p className="text-small text-fg-muted mb-5">Create a key to connect external tools to your Qwikly data.</p>
            <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>
              Create first key
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {keys.map((k) => (
              <div key={k.id} className="py-4 first:pt-0 last:pb-0">
                {pendingAction?.key.id === k.id ? (
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-input border border-[var(--border)]">
                    <div className="flex items-center gap-2 text-small text-fg">
                      <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                      {pendingAction.type === "revoke"
                        ? `Revoke "${k.name}"? Any app using this key will stop working immediately.`
                        : `Rotate "${k.name}"? The old key will stop working immediately.`}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setPendingAction(null)} disabled={actionLoading}>Cancel</Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={actionLoading}
                        icon={pendingAction.type === "revoke" ? <Trash2 className="w-3.5 h-3.5" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        onClick={() => pendingAction.type === "revoke" ? confirmRevoke(k) : confirmRotate(k)}
                      >
                        {pendingAction.type === "revoke" ? "Revoke" : "Rotate"}
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-small font-semibold text-fg">{k.name}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <code className="text-tiny font-mono text-fg-muted bg-surface-input px-2 py-0.5 rounded-md">
                          {k.key_prefix}••••••••••••••••
                        </code>
                        {k.scopes.map((s) => (
                          <Badge key={s} tone="neutral">{s}</Badge>
                        ))}
                      </div>
                      <p className="text-tiny text-fg-subtle mt-1">
                        Created {new Date(k.created_at).toLocaleDateString()}
                        {k.last_used_at && ` · Last used ${new Date(k.last_used_at).toLocaleDateString()}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" title="Rotate key" onClick={() => setPendingAction({ type: "rotate", key: k })}>
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="icon" title="Revoke key" onClick={() => setPendingAction({ type: "revoke", key: k })}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {createOpen && (
        <CreateKeyModal
          onClose={() => setCreateOpen(false)}
          onCreated={(key, fullKey) => {
            setKeys((prev) => [key, ...prev]);
            setCreateOpen(false);
            setNewKey({ name: key.name, full_key: fullKey });
          }}
          onError={(msg) => show(msg, "danger")}
        />
      )}

      {newKey && (
        <RevealModal
          name={newKey.name}
          fullKey={newKey.full_key}
          copied={copied}
          onCopy={() => copyKey(newKey.full_key)}
          onClose={() => setNewKey(null)}
        />
      )}
    </>
  );
}

// ─── Create modal ─────────────────────────────────────────────────────────────

function CreateKeyModal({
  onClose, onCreated, onError,
}: {
  onClose: () => void;
  onCreated: (key: ApiKey, fullKey: string) => void;
  onError: (msg: string) => void;
}) {
  const [name, setName] = useState("");
  const [scopes, setScopes] = useState<string[]>(["conversations:read"]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (scope: string) =>
    setScopes((prev) => prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!name.trim()) return setErr("Name is required.");
    if (scopes.length === 0) return setErr("Select at least one scope.");
    setSaving(true);
    const res = await fetch("/api/settings/api-keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), scopes }),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return setErr(j.error ?? "Failed to create key.");
    }
    const data = await res.json();
    const { full_key, ...key } = data;
    onCreated(key as ApiKey, full_key as string);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="w-full max-w-md pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">New API key</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover cursor-pointer">
              <XIcon className="w-4 h-4 text-fg-muted" />
            </button>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Key name" hint="e.g. Zapier integration, CRM sync">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="My integration" autoFocus />
            </Field>
            <div>
              <p className="text-small font-medium text-fg mb-2">Scopes</p>
              <div className="space-y-2">
                {ALL_SCOPES.map((s) => (
                  <label key={s.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={scopes.includes(s.id)}
                      onChange={() => toggle(s.id)}
                      className="w-4 h-4 rounded border-[var(--border)] accent-ember cursor-pointer"
                    />
                    <span className="text-small text-fg group-hover:text-fg-muted transition-colors">{s.label}</span>
                  </label>
                ))}
              </div>
            </div>
            {err && <p className="text-small text-danger">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={saving} icon={<Plus className="w-4 h-4" />}>Create key</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}

// ─── Reveal modal ─────────────────────────────────────────────────────────────

function RevealModal({ name, fullKey, copied, onCopy, onClose }: {
  name: string;
  fullKey: string;
  copied: boolean;
  onCopy: () => void;
  onClose: () => void;
}) {
  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="w-full max-w-lg pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-h2 text-fg">Key created: {name}</h2>
          </div>
          <div className="p-4 rounded-xl bg-surface-input border border-[var(--border)] mb-4">
            <p className="text-tiny text-fg-muted mb-2 font-semibold uppercase tracking-wide">Your new API key</p>
            <p className="font-mono text-small text-fg break-all">{fullKey}</p>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 mb-5">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
            <p className="text-tiny text-amber-700 dark:text-amber-400">
              Copy this key now. You won&apos;t be able to see it again after closing this window.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" icon={copied ? <CheckCheck className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />} onClick={onCopy}>
              {copied ? "Copied!" : "Copy key"}
            </Button>
            <Button variant="primary" onClick={onClose}>Done</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
