"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, FormEvent } from "react";
import { Check, AlertCircle, UserPlus, RefreshCw, Trash2, X as XIcon, Crown, Lock, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Select, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";
import { useClient } from "@/lib/use-client";
import { resolvePlan } from "@/lib/plan";

type Role = "owner" | "admin" | "editor" | "viewer";
type Status = "pending" | "active" | "revoked";

interface Member {
  id: string;
  email: string;
  user_id: string | null;
  role: Role;
  status: Status;
  invited_at: string;
  accepted_at: string | null;
}

type Toast = { msg: string; tone: "success" | "danger" };

const ROLE_LABELS: Record<Role, string> = {
  owner: "Owner",
  admin: "Admin",
  editor: "Editor",
  viewer: "Viewer",
};

const ROLE_DESC: Record<Role, string> = {
  owner: "Full access including billing and team management",
  admin: "Full access including billing, cannot transfer ownership",
  editor: "Can manage content and settings, no billing access",
  viewer: "Read-only access to all dashboard sections",
};

const STATUS_TONE: Record<Status, "neutral" | "success" | "warning" | "danger"> = {
  active: "success",
  pending: "warning",
  revoked: "danger",
};

export default function TeamPage() {
  const { client, loading: clientLoading } = useClient();
  const tier = resolvePlan(client?.plan);
  const canUseTeam = tier === "business";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const show = (msg: string, tone: "success" | "danger" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };

  const load = async () => {
    setLoading(true);
    const res = await fetch("/api/settings/team");
    if (res.ok) setMembers(await res.json());
    setLoading(false);
  };

  useEffect(() => {
    if (canUseTeam) load();
    else setLoading(false);
  }, [canUseTeam]);

  const resendInvite = async (m: Member) => {
    const res = await fetch("/api/settings/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: m.email, role: m.role }),
    });
    if (res.ok) show("Invite resent");
    else show("Failed to resend", "danger");
  };

  const revoke = async (m: Member) => {
    if (!confirm(`Remove ${m.email} from your team?`)) return;
    const res = await fetch(`/api/settings/team/${m.id}`, { method: "DELETE" });
    if (res.ok) { setMembers((prev) => prev.filter((x) => x.id !== m.id)); show("Member removed"); }
    else show("Failed to remove", "danger");
  };

  const updateRole = async (m: Member, role: Role) => {
    const res = await fetch(`/api/settings/team/${m.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      setMembers((prev) => prev.map((x) => x.id === m.id ? { ...x, role } : x));
      setEditingId(null);
      show("Role updated");
    } else show("Failed to update role", "danger");
  };

  if (!clientLoading && !canUseTeam) {
    return (
      <>
        <PageHeader
          title="Team"
          description="Manage who has access to your Qwikly workspace."
        />
        <Card>
          <div className="flex flex-col items-center text-center gap-5 py-10 px-6">
            <div className="w-14 h-14 rounded-2xl bg-ink/[0.05] border border-ink/[0.08] flex items-center justify-center">
              <Lock className="w-6 h-6 text-ink-400" />
            </div>
            <div className="max-w-sm">
              <p className="text-h3 font-semibold text-fg">Team accounts are a Business feature</p>
              <p className="text-small text-fg-muted mt-2 leading-relaxed">
                Upgrade to Business to invite team members, assign roles, and manage access across your workspace.
              </p>
            </div>
            <Link
              href="/dashboard/billing"
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-ember text-paper text-small font-medium hover:bg-ember-deep transition-colors duration-150 cursor-pointer"
            >
              Upgrade to Business <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-tiny text-fg-subtle">R1,499/month · No per-job fees. Ever.</p>
          </div>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Team"
        description="Manage who has access to your Qwikly workspace."
        actions={
          <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => setInviteOpen(true)}>
            Invite member
          </Button>
        }
      />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 panel-strong px-4 py-2.5 flex items-center gap-2 animate-slide-up">
          {toast.tone === "success" ? <Check className="w-4 h-4 text-success" /> : <AlertCircle className="w-4 h-4 text-danger" />}
          <span className="text-small text-fg">{toast.msg}</span>
        </div>
      )}

      {/* Role descriptions */}
      <Card className="mb-6">
        <CardHeader title="Role permissions" description="What each role can access in your workspace." />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {(Object.entries(ROLE_DESC) as [Role, string][]).map(([role, desc]) => (
            <div key={role} className="flex items-start gap-3 p-3 rounded-xl bg-surface-input border border-[var(--border)]">
              {role === "owner" && <Crown className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />}
              <div>
                <p className="text-small font-semibold text-fg">{ROLE_LABELS[role]}</p>
                <p className="text-tiny text-fg-muted mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Member list */}
      <Card>
        <CardHeader title="Members" description={loading ? "Loading…" : `${members.length} member${members.length !== 1 ? "s" : ""}`} />
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-surface-input animate-pulse" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-small text-fg-muted">No team members yet. Invite someone to get started.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {members.map((m) => (
              <div key={m.id} className="py-4 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-ember/10 border border-ember/20 flex items-center justify-center shrink-0">
                    <span className="text-small font-semibold text-ember">{m.email.charAt(0).toUpperCase()}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-small font-medium text-fg truncate">{m.email}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Badge tone={STATUS_TONE[m.status]} dot>{m.status}</Badge>
                      {editingId === m.id ? (
                        <div className="flex items-center gap-1.5">
                          <Select
                            className="!h-7 !py-0.5 !text-tiny !rounded-lg w-28"
                            defaultValue={m.role}
                            onChange={(e) => updateRole(m, e.target.value as Role)}
                          >
                            {(["admin", "editor", "viewer"] as Role[]).map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                            ))}
                          </Select>
                          <button onClick={() => setEditingId(null)} className="p-1 rounded hover:bg-surface-hover cursor-pointer">
                            <XIcon className="w-3.5 h-3.5 text-fg-muted" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => m.role !== "owner" && setEditingId(m.id)}
                          className={cn(
                            "text-tiny text-fg-muted",
                            m.role !== "owner" && "hover:text-fg cursor-pointer underline-offset-2 hover:underline"
                          )}
                        >
                          {ROLE_LABELS[m.role]}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                {m.role !== "owner" && (
                  <div className="flex items-center gap-1 shrink-0">
                    {m.status === "pending" && (
                      <Button variant="ghost" size="icon" title="Resend invite" onClick={() => resendInvite(m)}>
                        <RefreshCw className="w-4 h-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" title="Remove" onClick={() => revoke(m)}>
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {inviteOpen && (
        <InviteModal
          onClose={() => setInviteOpen(false)}
          onInvited={(m) => {
            setMembers((prev) => {
              const exists = prev.some((x) => x.id === m.id);
              return exists ? prev.map((x) => x.id === m.id ? m : x) : [m, ...prev];
            });
            setInviteOpen(false);
            show(`Invite sent to ${m.email}`);
          }}
        />
      )}
    </>
  );
}

function InviteModal({ onClose, onInvited }: { onClose: () => void; onInvited: (m: Member) => void }) {
  const [form, setForm] = useState({ email: "", role: "editor" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!form.email.trim()) return setErr("Email is required.");
    setSaving(true);
    const res = await fetch("/api/settings/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return setErr(j.error ?? "Failed to invite.");
    }
    const member = await res.json();
    onInvited(member);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <Card className="w-full max-w-md pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">Invite team member</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover cursor-pointer">
              <XIcon className="w-4 h-4 text-fg-muted" />
            </button>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Email address">
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="team@business.co.za"
                autoFocus
              />
            </Field>
            <Field label="Role" hint={ROLE_DESC[form.role as Role]}>
              <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                <option value="admin">Admin</option>
                <option value="editor">Editor</option>
                <option value="viewer">Viewer</option>
              </Select>
            </Field>
            {err && <p className="text-small text-danger">{err}</p>}
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
              <Button type="submit" loading={saving} icon={<UserPlus className="w-4 h-4" />}>Send invite</Button>
            </div>
          </form>
        </Card>
      </div>
    </>
  );
}
