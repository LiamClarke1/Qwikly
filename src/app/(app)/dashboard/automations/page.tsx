"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Zap, Plus, X, Check, Play, Pause, Trash2,
  CalendarCheck, Star, Clock, AlertTriangle, MessageSquare, ArrowRight,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { timeAgo } from "@/lib/format";
import { useClient } from "@/lib/use-client";
import { cn } from "@/lib/cn";

type TriggerType = "booking_created" | "booking_completed" | "no_show" | "recall_due";
type ActionType = "send_whatsapp" | "escalate";

interface Automation {
  id: string;
  client_id: number;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: { delay_hours?: number; days_since?: number };
  action_type: ActionType;
  action_config: { template_body?: string };
  is_active: boolean;
  last_fired_at: string | null;
  fire_count: number;
  created_at: string;
}

const TRIGGERS: Record<TriggerType, { label: string; desc: string; icon: React.ComponentType<{ className?: string }> }> = {
  booking_created: { label: "Booking created", desc: "When a new booking is confirmed", icon: CalendarCheck },
  booking_completed: { label: "Booking completed", desc: "After a job is marked done", icon: Check },
  no_show: { label: "No-show", desc: "When a customer misses their appointment", icon: AlertTriangle },
  recall_due: { label: "Time since last booking", desc: "X days since last visit", icon: Clock },
};

const ACTIONS: Record<ActionType, { label: string }> = {
  send_whatsapp: { label: "Send WhatsApp" },
  escalate: { label: "Alert me" },
};

type RecipeConfig = {
  name: string;
  description: string;
  trigger_type: TriggerType;
  trigger_config: { delay_hours?: number; days_since?: number };
  action_type: ActionType;
  action_config: { template_body?: string };
};

const RECIPES: RecipeConfig[] = [
  {
    name: "Day-before reminder",
    description: "Remind customers the day before their appointment",
    trigger_type: "booking_created", trigger_config: { delay_hours: -24 },
    action_type: "send_whatsapp", action_config: { template_body: "Hi {{name}}, quick reminder about your appointment tomorrow at {{time}}. Reply RESCHEDULE if you need to move it." },
  },
  {
    name: "Review request",
    description: "Ask happy customers for a Google review after the job",
    trigger_type: "booking_completed", trigger_config: { delay_hours: 2 },
    action_type: "send_whatsapp", action_config: { template_body: "Hi {{name}}, thanks for choosing {{business}}! If we got it right, a quick Google review would mean the world: {{review_link}}" },
  },
  {
    name: "No-show follow-up",
    description: "Check in with customers who miss their slot",
    trigger_type: "no_show", trigger_config: { delay_hours: 4 },
    action_type: "send_whatsapp", action_config: { template_body: "Hi {{name}}, we missed you today. Everything OK? Reply here to rebook." },
  },
  {
    name: "90-day recall",
    description: "Win back customers who haven't booked in 3 months",
    trigger_type: "recall_due", trigger_config: { days_since: 90 },
    action_type: "send_whatsapp", action_config: { template_body: "Hi {{name}}, been a while! Ready for your next visit to {{business}}?" },
  },
];

export default function AutomationsPage() {
  const { client } = useClient();
  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!client) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("automations")
        .select("*")
        .eq("client_id", client.id)
        .order("created_at", { ascending: false });
      setItems((data as Automation[]) ?? []);
      setLoading(false);
    })();
  }, [client]);

  const toggle = async (a: Automation) => {
    const patch = { is_active: !a.is_active };
    await supabase.from("automations").update(patch).eq("id", a.id);
    setItems((list) => list.map((x) => (x.id === a.id ? { ...x, ...patch } : x)));
  };

  const remove = async (a: Automation) => {
    if (!confirm(`Delete "${a.name}"?`)) return;
    await supabase.from("automations").delete().eq("id", a.id);
    setItems((list) => list.filter((x) => x.id !== a.id));
  };

  const applyRecipe = async (r: RecipeConfig) => {
    if (!client) return;
    const { data } = await supabase
      .from("automations")
      .insert({ ...r, client_id: client.id as unknown as number, is_active: false })
      .select()
      .single();
    if (data) setItems((list) => [data as Automation, ...list]);
  };

  return (
    <>
      <PageHeader
        title="Automations"
        description="Rules that fire so you don't have to. Reminders, review requests, recalls."
        actions={
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
            New automation
          </Button>
        }
      />

      <div className="max-w-4xl">
        {items.length === 0 && !loading && (
          <Card className="mb-6 !p-6">
            <p className="text-h3 text-fg font-semibold mb-1">Start with a recipe</p>
            <p className="text-small text-fg-muted mb-5">Pre-built automations. Off by default, turn on when ready.</p>
            <div className="grid md:grid-cols-2 gap-3">
              {RECIPES.map((r) => {
                const T = TRIGGERS[r.trigger_type];
                return (
                  <button
                    key={r.name}
                    onClick={() => applyRecipe(r)}
                    className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:border-line-strong text-left transition-colors cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 text-fg-muted">
                        <T.icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-body font-semibold text-fg">{r.name}</p>
                        <p className="text-tiny text-fg-muted mt-0.5">{r.description}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </Card>
        )}

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : items.length === 0 ? null : (
          <div className="space-y-2">
            {items.map((a) => {
              const T = TRIGGERS[a.trigger_type];
              const A = ACTIONS[a.action_type];
              return (
                <Card
                  key={a.id}
                  className="hover:border-line-strong transition-colors cursor-pointer"
                  onClick={() => setEditing(a)}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 text-fg-muted">
                      <T.icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-body font-semibold text-fg">{a.name}</p>
                        <Badge tone={a.is_active ? "success" : "neutral"} dot>{a.is_active ? "active" : "paused"}</Badge>
                      </div>
                      {a.description && <p className="text-small text-fg-muted mt-0.5 line-clamp-1">{a.description}</p>}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-tiny text-fg-subtle">
                        <span>{T.label}</span>
                        <ArrowRight className="w-3 h-3" />
                        <span>{A.label}</span>
                        <span className="ml-2">Fired {a.fire_count}×</span>
                        {a.last_fired_at && <span>· last {timeAgo(a.last_fired_at)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" onClick={() => toggle(a)} title={a.is_active ? "Pause" : "Resume"}>
                        {a.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove(a)}><Trash2 className="w-4 h-4" /></Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {(creating || editing) && client && (
        <AutomationEditor
          clientId={client.id as unknown as number}
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(a) => {
            setItems((list) => {
              const exists = list.some((x) => x.id === a.id);
              return exists ? list.map((x) => (x.id === a.id ? a : x)) : [a, ...list];
            });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </>
  );
}

function AutomationEditor({
  clientId, initial, onClose, onSaved,
}: {
  clientId: number;
  initial: Automation | null;
  onClose: () => void;
  onSaved: (a: Automation) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [trigger, setTrigger] = useState<TriggerType>(initial?.trigger_type ?? "booking_completed");
  const [action, setAction] = useState<ActionType>(initial?.action_type ?? "send_whatsapp");
  const [delayHours, setDelayHours] = useState(String(initial?.trigger_config?.delay_hours ?? 24));
  const [daysSince, setDaysSince] = useState(String(initial?.trigger_config?.days_since ?? 90));
  const [template, setTemplate] = useState(initial?.action_config?.template_body ?? "");
  const [active, setActive] = useState(initial?.is_active ?? false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!name.trim()) return setErr("Name is required.");
    setSaving(true);

    const trigger_config: { delay_hours?: number; days_since?: number } = {};
    if (trigger === "recall_due") trigger_config.days_since = Number(daysSince);
    else trigger_config.delay_hours = Number(delayHours);

    const action_config: { template_body?: string } = {};
    if (action === "send_whatsapp") action_config.template_body = template;

    const payload = {
      client_id: clientId,
      name: name.trim(),
      trigger_type: trigger,
      trigger_config,
      action_type: action,
      action_config,
      is_active: active,
    };

    const q = initial
      ? supabase.from("automations").update(payload).eq("id", initial.id).select().single()
      : supabase.from("automations").insert(payload).select().single();
    const { data, error } = await q;
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved(data as Automation);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
        <Card className="w-full max-w-xl my-8 pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">{initial ? "Edit automation" : "New automation"}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer"><X className="w-4 h-4 text-fg-muted" /></button>
          </div>

          <div className="space-y-4">
            <Field label="Name"><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="No-show follow-up" /></Field>

            <div>
              <p className="text-small font-medium text-fg mb-2">When</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {(Object.keys(TRIGGERS) as TriggerType[]).map((t) => {
                  const T = TRIGGERS[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setTrigger(t)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-3",
                        trigger === t ? "border-brand bg-brand/[0.08]" : "border-white/[0.06] bg-white/[0.02] hover:border-line-strong"
                      )}
                    >
                      <T.icon className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-small font-semibold text-fg">{T.label}</p>
                        <p className="text-tiny text-fg-muted">{T.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {trigger === "recall_due" ? (
              <Field label="Days since last booking"><Input type="number" value={daysSince} onChange={(e) => setDaysSince(e.target.value)} /></Field>
            ) : (
              <Field label="Delay (hours)" hint="Negative means before the event (e.g. -24 for day-before reminder)">
                <Input type="number" value={delayHours} onChange={(e) => setDelayHours(e.target.value)} />
              </Field>
            )}

            <div>
              <p className="text-small font-medium text-fg mb-2">Then</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ACTIONS) as ActionType[]).map((a) => {
                  const A = ACTIONS[a];
                  return (
                    <button
                      key={a}
                      onClick={() => setAction(a)}
                      className={cn(
                        "p-3 rounded-xl border text-center transition-colors cursor-pointer",
                        action === a ? "border-brand bg-brand/[0.08]" : "border-white/[0.06] bg-white/[0.02] hover:border-line-strong"
                      )}
                    >
                      <p className="text-small font-semibold text-fg">{A.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {action === "send_whatsapp" && (
              <Field label="Message" hint="Variables: {{name}}, {{business}}, {{time}}">
                <Textarea rows={4} value={template} onChange={(e) => setTemplate(e.target.value)} placeholder="Hi {{name}}, ..." />
              </Field>
            )}

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="accent-brand w-4 h-4" />
              <span className="text-small text-fg">Turn on immediately</span>
            </label>

            {err && <p className="text-small text-danger">{err}</p>}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-white/[0.06]">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={saving} icon={<Check className="w-4 h-4" />} onClick={save}>
              {initial ? "Update" : "Create"}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}
