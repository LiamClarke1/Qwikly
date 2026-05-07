"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, FormEvent } from "react";
import { Check, AlertCircle, UserPlus, RefreshCw, Trash2, X as XIcon, Lock, ArrowRight, AlertTriangle, Users } from "lucide-react";
import Link from "next/link";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page";
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

const STATUS_TONE: Record<Status, "neutral" | "success" | "warning" | "danger"> = {
  active: "success",
  pending: "warning",
  revoked: "danger",
};

export default function TeamPage() {
  const { client, loading: clientLoading } = useClient();
  const tier = resolvePlan(client?.plan);
  const canUseTeam = tier === "premium" || tier === "billions";

  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<Toast | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null);
  const [revokeLoading, setRevokeLoading] = useState(false);

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
    setRevokeLoading(true);
    const res = await fetch(`/api/settings/team/${m.id}`, { method: "DELETE" });
    setRevokeLoading(false);
    setPendingRevokeId(null);
    if (res.ok) { setMembers((prev) => prev.filter((x) => x.id !== m.id)); show("Member removed"); }
    else show("Failed to remove", "danger");
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
              <p className="text-h3 font-semibold text-fg">Team access requires Premium</p>
              <p className="text-small text-fg-muted mt-2 leading-relaxed">
                Upgrade to Premium to invite team members and manage workspace access.
              </p>
            </div>
            <Link
              href="/dashboard/settings/billing"
              className="inline-flex items-center gap-2 px-5 h-10 rounded-xl bg-ember text-paper text-small font-medium hover:bg-ember-deep transition-colors duration-150 cursor-pointer"
            >
              View plans <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="text-tiny text-fg-subtle">R1,299/month · No per-lead fees. Cancel anytime.</p>
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

      {/* Member list */}
      <Card>
        <CardHeader title="Members" description={loading ? "Loading…" : `${members.length} member${members.length !== 1 ? "s" : ""}`} />
        {loading ? (
          <div className="space-y-3">
            {[1, 2].map((i) => <div key={i} className="h-16 rounded-xl bg-surface-input animate-pulse" />)}
          </div>
        ) : members.length === 0 ? (
          <div className="py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-surface-input border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
              <Users className="w-5 h-5 text-fg-muted" />
            </div>
            <p className="text-body font-semibold text-fg mb-1">No team members yet</p>
            <p className="text-small text-fg-muted mb-5">Invite a team member to give them access to your workspace.</p>
            <Button variant="primary" size="sm" icon={<UserPlus className="w-4 h-4" />} onClick={() => setInviteOpen(true)}>
              Invite first member
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {members.map((m) => (
              <div key={m.id} className="py-4 first:pt-0 last:pb-0">
                {pendingRevokeId === m.id ? (
                  <div className="flex items-center justify-between gap-4 p-3 rounded-xl bg-surface-input border border-[var(--border)]">
                    <div className="flex items-center gap-2 text-small text-fg">
                      <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
                      Remove {m.email} from your team?
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button variant="ghost" size="sm" onClick={() => setPendingRevokeId(null)} disabled={revokeLoading}>Cancel</Button>
                      <Button variant="danger" size="sm" loading={revokeLoading} icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => revoke(m)}>Remove</Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-ember/10 border border-ember/20 flex items-center justify-center shrink-0">
                        <span className="text-small font-semibold text-ember">{m.email.charAt(0).toUpperCase()}</span>
                      </div>
                      <div className="min-w-0">
                        <p className="text-small font-medium text-fg truncate">{m.email}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Badge tone={STATUS_TONE[m.status]} dot>{m.status}</Badge>
                          <span className="text-tiny text-fg-muted">{ROLE_LABELS[m.role]}</span>
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
                        <Button variant="ghost" size="icon" title="Remove" onClick={() => setPendingRevokeId(m.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    )}
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
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!email.trim()) return setErr("Email is required.");
    setSaving(true);
    const res = await fetch("/api/settings/team", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim(), role: "viewer" }),
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
            <button onClick={onClose} aria-label="Close" className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-surface-hover cursor-pointer">
              <XIcon className="w-4 h-4 text-fg-muted" />
            </button>
          </div>
          <form className="space-y-4" onSubmit={submit}>
            <Field label="Email address">
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="team@business.co.za"
                autoFocus
              />
            </Field>
            <p className="text-tiny text-fg-muted">
              Invited members get read-only access to your dashboard.
            </p>
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
