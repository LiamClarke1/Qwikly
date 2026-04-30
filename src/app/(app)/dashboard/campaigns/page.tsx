"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { Megaphone, Plus, Send, X, Trash2, Sparkles } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { timeAgo } from "@/lib/format";
import { useClient } from "@/lib/use-client";

type Goal = "broadcast" | "recall" | "review" | "promo";
type Status = "draft" | "scheduled" | "sending" | "sent" | "paused";

interface Campaign {
  id: string;
  client_id: number;
  name: string;
  goal: Goal;
  status: Status;
  message_body: string;
  audience_filter: { lifecycle?: string[]; days_since_booking?: number };
  audience_count: number;
  scheduled_at: string | null;
  sent_at: string | null;
  sent_count: number;
  reply_count: number;
  booked_count: number;
  created_at: string;
}

const GOAL_META: Record<Goal, { label: string; desc: string; template: string }> = {
  broadcast: { label: "Broadcast", desc: "Announcement to everyone", template: "Hi {{name}}, quick update from {{business}}:\n\n{{message}}" },
  recall: { label: "Recall", desc: "Win back dormant customers", template: "Hi {{name}}, it's been a while! Ready for your next visit to {{business}}?" },
  review: { label: "Review request", desc: "Ask happy customers to review you", template: "Hi {{name}}, thanks for choosing {{business}}! A quick Google review would mean the world: {{review_link}}" },
  promo: { label: "Promotion", desc: "Time-limited offer", template: "Hi {{name}}, this week only at {{business}}: {{offer}}. Reply BOOK to claim." },
};

const STATUS_TONES: Record<Status, "neutral" | "brand" | "success" | "warning"> = {
  draft: "neutral",
  scheduled: "brand",
  sending: "brand",
  sent: "success",
  paused: "warning",
};

export default function CampaignsPage() {
  const { client } = useClient();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Campaign | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!client) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("campaigns")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });
      setCampaigns((data as Campaign[]) ?? []);
      setLoading(false);
    })();
  }, [client]);

  const remove = async (c: Campaign) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    await supabase.from("campaigns").delete().eq("id", c.id);
    setCampaigns((cs) => cs.filter((x) => x.id !== c.id));
  };

  return (
    <>
      <PageHeader
        title="Campaigns"
        description="Send a WhatsApp message to a group of contacts. Broadcasts, recalls, review requests."
        actions={
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
            New campaign
          </Button>
        }
      />

      <div className="max-w-4xl">
        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : campaigns.length === 0 ? (
          <Card className="!p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <Megaphone className="w-5 h-5 text-fg-muted" />
            </div>
            <p className="text-body font-semibold text-fg">No campaigns yet</p>
            <p className="text-small text-fg-muted mt-1 max-w-sm mx-auto">
              Your first recall campaign could bring back customers who haven&apos;t booked in months.
            </p>
            <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)} className="mt-5">
              Create first campaign
            </Button>
          </Card>
        ) : (
          <div className="space-y-2">
            {campaigns.map((c) => (
              <Card
                key={c.id}
                className="hover:border-line-strong transition-colors cursor-pointer"
                onClick={() => setEditing(c)}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-body font-semibold text-fg truncate">{c.name}</p>
                      <Badge tone={STATUS_TONES[c.status]}>{c.status}</Badge>
                    </div>
                    <p className="text-small text-fg-muted mt-1 line-clamp-1">{c.message_body}</p>
                    <div className="flex flex-wrap items-center gap-3 mt-2 text-tiny text-fg-subtle">
                      <span>{c.audience_count} recipients</span>
                      <span>·</span>
                      <span>{c.sent_count} sent</span>
                      <span>·</span>
                      <span>{c.reply_count} replies</span>
                      {c.sent_at && <><span>·</span><span>Sent {timeAgo(c.sent_at)}</span></>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(c); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && client && (
        <CampaignEditor
          clientId={client.id as unknown as number}
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(c) => {
            setCampaigns((cs) => {
              const exists = cs.some((x) => x.id === c.id);
              return exists ? cs.map((x) => (x.id === c.id ? c : x)) : [c, ...cs];
            });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function CampaignEditor({
  clientId, initial, onClose, onSaved,
}: {
  clientId: number;
  initial: Campaign | null;
  onClose: () => void;
  onSaved: (c: Campaign) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "broadcast");
  const [message, setMessage] = useState(initial?.message_body ?? "");
  const [lifecycle, setLifecycle] = useState(initial?.audience_filter?.lifecycle?.[0] ?? "all");
  const [scheduleAt, setScheduleAt] = useState(initial?.scheduled_at?.slice(0, 16) ?? "");
  const [audienceCount, setAudienceCount] = useState<number | null>(initial?.audience_count ?? null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      let q = supabase.from("contacts").select("id", { count: "exact", head: true }).eq("client_id", clientId);
      if (lifecycle !== "all") q = q.eq("lifecycle_stage", lifecycle);
      const { count } = await q;
      setAudienceCount(count ?? 0);
    })();
  }, [clientId, lifecycle]);

  const useTemplate = () => setMessage(GOAL_META[goal].template);

  const save = async (launch: boolean) => {
    setErr(null);
    if (!name.trim()) return setErr("Name is required.");
    if (!message.trim()) return setErr("Message is required.");
    setSaving(true);

    const payload = {
      client_id: clientId,
      name: name.trim(),
      goal,
      channel: "whatsapp",
      status: launch ? (scheduleAt ? "scheduled" : "sending") : "draft",
      message_body: message,
      audience_filter: lifecycle === "all" ? {} : { lifecycle: [lifecycle] },
      audience_count: audienceCount ?? 0,
      scheduled_at: scheduleAt ? new Date(scheduleAt).toISOString() : null,
    };

    const q = initial
      ? supabase.from("campaigns").update(payload).eq("id", initial.id).select().single()
      : supabase.from("campaigns").insert(payload).select().single();
    const { data, error } = await q;
    setSaving(false);
    if (error) return setErr(error.message);
    if (launch && !scheduleAt) {
      const sendRes = await fetch(`/api/campaigns/${(data as Campaign).id}/send`, { method: "POST" });
      if (!sendRes.ok) {
        const sendErr = await sendRes.json().catch(() => ({}));
        return setErr((sendErr as { error?: string }).error ?? "Failed to send campaign. Please try again.");
      }
    }
    onSaved(data as Campaign);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
        <Card className="w-full max-w-xl my-8 pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">{initial ? "Edit campaign" : "New campaign"}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer"><X className="w-4 h-4 text-fg-muted" /></button>
          </div>

          <div className="space-y-4">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring recall" /></Field>

            <Field label="Type">
              <Select value={goal} onChange={(e) => setGoal(e.target.value as Goal)}>
                {(Object.keys(GOAL_META) as Goal[]).map((g) => (
                  <option key={g} value={g}>{GOAL_META[g].label}: {GOAL_META[g].desc}</option>
                ))}
              </Select>
            </Field>

            <Field label="Send to">
              <Select value={lifecycle} onChange={(e) => setLifecycle(e.target.value)}>
                <option value="all">Everyone</option>
                <option value="lead">Leads only</option>
                <option value="customer">Customers only</option>
                <option value="champion">Champions only</option>
                <option value="dormant">Dormant only</option>
              </Select>
              <p className="text-tiny text-fg-muted mt-1.5">
                {audienceCount === null ? "…" : <><strong className="text-fg">{audienceCount}</strong> {audienceCount === 1 ? "contact" : "contacts"} will receive this</>}
              </p>
            </Field>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-small font-medium text-fg">Message</p>
                <button onClick={useTemplate} className="text-tiny text-brand hover:underline font-medium inline-flex items-center gap-1 cursor-pointer">
                  <Sparkles className="w-3 h-3" /> Use template
                </button>
              </div>
              <Textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Use {{name}} and {{business}} for personalisation" />
            </div>

            <Field label="Schedule (optional)" hint="Leave empty to send immediately when launched">
              <Input type="datetime-local" value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            </Field>

            {err && <p className="text-small text-danger">{err}</p>}
          </div>

          <div className="flex justify-between gap-2 mt-6 pt-5 border-t border-white/[0.06]">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <div className="flex gap-2">
              <Button variant="secondary" loading={saving} onClick={() => save(false)}>Save draft</Button>
              <Button variant="primary" loading={saving} icon={<Send className="w-4 h-4" />} onClick={() => save(true)}>
                {scheduleAt ? "Schedule" : "Send now"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}
