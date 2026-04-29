"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import {
  Plus, X, Check, Play, Pause, Trash2,
  CalendarCheck, Star, Clock, AlertTriangle, ArrowRight,
  Bell, Mail, MessageSquare, Smartphone, FileText, CreditCard,
  Wrench,
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

type TriggerType =
  | "booking_created"
  | "booking_completed"
  | "no_show"
  | "recall_due"
  | "job_starting_soon"
  | "quote_sent"
  | "payment_due";

type ActionType = "send_whatsapp" | "send_email" | "escalate" | "alert_email";

interface Automation {
  id: string;
  client_id: number;
  name: string;
  description: string | null;
  trigger_type: TriggerType;
  trigger_config: { delay_hours?: number; delay_minutes?: number; days_since?: number };
  action_type: ActionType;
  action_config: { template_body?: string };
  is_active: boolean;
  last_fired_at: string | null;
  fire_count: number;
  created_at: string;
}

const TRIGGERS: Record<TriggerType, { label: string; desc: string; icon: React.ComponentType<{ className?: string }> }> = {
  booking_created:    { label: "Booking confirmed",       desc: "When a new booking is locked in",             icon: CalendarCheck },
  booking_completed:  { label: "Job completed",           desc: "After a job is marked done",                  icon: Check },
  no_show:            { label: "No-show",                 desc: "When a customer misses their slot",           icon: AlertTriangle },
  recall_due:         { label: "Time since last booking", desc: "X days since their last visit",               icon: Clock },
  job_starting_soon:  { label: "Job starting soon",       desc: "Minutes before a booking starts (alerts you)", icon: Bell },
  quote_sent:         { label: "Quote sent",              desc: "After a quote is issued, no reply yet",       icon: FileText },
  payment_due:        { label: "Invoice unpaid",          desc: "X days after invoice sent, still unpaid",     icon: CreditCard },
};

const ACTIONS: Record<ActionType, { label: string; desc: string; recipient: "customer" | "owner"; channel: "whatsapp" | "email"; icon: React.ComponentType<{ className?: string }> }> = {
  send_whatsapp: { label: "Send WhatsApp",        desc: "Message sent to the customer",          recipient: "customer", channel: "whatsapp", icon: MessageSquare },
  send_email:    { label: "Send Email",           desc: "Email sent to the customer",            recipient: "customer", channel: "email",    icon: Mail },
  escalate:      { label: "Alert me (WhatsApp)",  desc: "You get a WhatsApp notification",       recipient: "owner",    channel: "whatsapp", icon: Smartphone },
  alert_email:   { label: "Alert me (Email)",     desc: "You get an email notification",         recipient: "owner",    channel: "email",    icon: Bell },
};

type RecipeConfig = {
  name: string;
  description: string;
  trigger_type: TriggerType;
  trigger_config: { delay_hours?: number; delay_minutes?: number; days_since?: number };
  action_type: ActionType;
  action_config: { template_body?: string };
};

const STANDARD_RECIPES: RecipeConfig[] = [
  {
    name: "Day-before customer reminder",
    description: "WhatsApp the customer 24 hours before their appointment so they don't forget.",
    trigger_type: "booking_created", trigger_config: { delay_hours: -24 },
    action_type: "send_whatsapp",
    action_config: { template_body: "Hi {{name}}, just a reminder about your appointment tomorrow at {{time}}. Reply RESCHEDULE if you need to move it." },
  },
  {
    name: "1-hour job reminder (you)",
    description: "Get a WhatsApp alert 1 hour before each job so you're never late.",
    trigger_type: "job_starting_soon", trigger_config: { delay_minutes: 60 },
    action_type: "escalate",
    action_config: { template_body: "Heads up: {{customer}} in {{suburb}} starts in 1 hour. Address: {{address}}" },
  },
  {
    name: "30-min job reminder (you)",
    description: "Get a WhatsApp alert 30 minutes before each job starts. Good for back-to-back days.",
    trigger_type: "job_starting_soon", trigger_config: { delay_minutes: 30 },
    action_type: "escalate",
    action_config: { template_body: "Heads up: {{customer}} in {{suburb}} starts in 30 minutes. Address: {{address}}" },
  },
  {
    name: "Review request",
    description: "Ask happy customers for a Google review 2 hours after the job is done.",
    trigger_type: "booking_completed", trigger_config: { delay_hours: 2 },
    action_type: "send_whatsapp",
    action_config: { template_body: "Hi {{name}}, thanks for choosing {{business}}! If we got it right, a quick Google review means the world: {{review_link}}" },
  },
  {
    name: "No-show follow-up",
    description: "Check in with customers who miss their slot so you can rebook before they forget.",
    trigger_type: "no_show", trigger_config: { delay_hours: 4 },
    action_type: "send_whatsapp",
    action_config: { template_body: "Hi {{name}}, we missed you today. Everything OK? Reply here to rebook your slot." },
  },
  {
    name: "90-day recall",
    description: "Win back customers who haven't booked in 3 months with a friendly nudge.",
    trigger_type: "recall_due", trigger_config: { days_since: 90 },
    action_type: "send_whatsapp",
    action_config: { template_body: "Hi {{name}}, it's been a while! Ready for your next visit to {{business}}? Reply to book." },
  },
];

const OPTIONAL_RECIPES: RecipeConfig[] = [
  {
    name: "30-min job reminder via email",
    description: "Same as the WhatsApp reminder, but delivered to your inbox instead.",
    trigger_type: "job_starting_soon", trigger_config: { delay_minutes: 30 },
    action_type: "alert_email",
    action_config: { template_body: "Job starting soon: {{customer}} in {{suburb}} at {{time}}. Address: {{address}}" },
  },
  {
    name: "Quote follow-up",
    description: "Nudge customers who haven't replied to a quote after 24 hours.",
    trigger_type: "quote_sent", trigger_config: { delay_hours: 24 },
    action_type: "send_whatsapp",
    action_config: { template_body: "Hi {{name}}, just checking if you had a chance to look at the quote we sent? Happy to answer any questions." },
  },
  {
    name: "Invoice payment reminder",
    description: "Remind customers about an unpaid invoice 3 days after it was sent.",
    trigger_type: "payment_due", trigger_config: { days_since: 3 },
    action_type: "send_whatsapp",
    action_config: { template_body: "Hi {{name}}, a quick note that your invoice for {{service}} is still outstanding. Reply here or tap the link to pay." },
  },
  {
    name: "Invoice reminder via email",
    description: "Send an email payment reminder 3 days after an unpaid invoice.",
    trigger_type: "payment_due", trigger_config: { days_since: 3 },
    action_type: "send_email",
    action_config: { template_body: "Hi {{name}}, just a reminder that your invoice for {{service}} is still outstanding. Please use the link below to settle it." },
  },
  {
    name: "New booking alert (email)",
    description: "Get an email when a new job is booked so you can plan your day.",
    trigger_type: "booking_created", trigger_config: { delay_hours: 0 },
    action_type: "alert_email",
    action_config: { template_body: "New booking: {{customer}} in {{suburb}} on {{date}} at {{time}} for {{service}}." },
  },
  {
    name: "2-hour customer reminder",
    description: "Last-minute WhatsApp reminder sent to the customer 2 hours before their slot.",
    trigger_type: "booking_created", trigger_config: { delay_hours: -2 },
    action_type: "send_whatsapp",
    action_config: { template_body: "Hi {{name}}, your appointment with {{business}} is in 2 hours at {{time}}. See you soon!" },
  },
];

export default function AutomationsPage() {
  const { client } = useClient();
  const [items, setItems] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Automation | null>(null);
  const [creating, setCreating] = useState(false);
  const [recipeTab, setRecipeTab] = useState<"standard" | "optional">("standard");
  const [addingRecipe, setAddingRecipe] = useState<string | null>(null);

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
    setAddingRecipe(r.name);
    const { data } = await supabase
      .from("automations")
      .insert({ ...r, client_id: client.id as unknown as number, is_active: false })
      .select()
      .single();
    if (data) setItems((list) => [data as Automation, ...list]);
    setAddingRecipe(null);
  };

  const activeRecipeNames = new Set(items.map((x) => x.name));
  const recipes = recipeTab === "standard" ? STANDARD_RECIPES : OPTIONAL_RECIPES;

  return (
    <>
      <PageHeader
        title="Automations"
        description="Rules that fire automatically. Reminders, alerts, follow-ups, recalls."
        actions={
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
            Build your own
          </Button>
        }
      />

      <div className="max-w-4xl space-y-8">

        {/* ── Quick-add recipes ─────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-h3 text-fg font-semibold">Quick-add automations</p>
              <p className="text-small text-fg-muted mt-0.5">Off by default. Turn on when ready.</p>
            </div>
            <div className="flex rounded-xl border border-white/[0.08] overflow-hidden">
              {(["standard", "optional"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setRecipeTab(tab)}
                  className={cn(
                    "px-4 py-1.5 text-small font-medium capitalize cursor-pointer transition-colors",
                    recipeTab === tab
                      ? "bg-white/[0.08] text-fg"
                      : "text-fg-muted hover:text-fg hover:bg-white/[0.04]"
                  )}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            {recipes.map((r) => {
              const T = TRIGGERS[r.trigger_type];
              const A = ACTIONS[r.action_type];
              const alreadyAdded = activeRecipeNames.has(r.name);
              return (
                <div
                  key={r.name}
                  className={cn(
                    "p-4 rounded-xl border flex flex-col gap-3 transition-colors",
                    alreadyAdded
                      ? "border-brand/30 bg-brand/[0.04]"
                      : "border-white/[0.06] bg-white/[0.02]"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/[0.04] flex items-center justify-center shrink-0 text-fg-muted">
                      <T.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-body font-semibold text-fg leading-snug">{r.name}</p>
                      <p className="text-tiny text-fg-muted mt-0.5 leading-relaxed">{r.description}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={cn(
                        "inline-flex items-center gap-1 text-tiny px-2 py-0.5 rounded-full font-medium",
                        A.channel === "whatsapp" ? "bg-[#25D366]/10 text-[#25D366]" : "bg-brand/10 text-brand"
                      )}>
                        <A.icon className="w-2.5 h-2.5" />
                        {A.label}
                      </span>
                      {A.recipient === "owner" && (
                        <span className="text-tiny text-fg-subtle bg-white/[0.04] px-2 py-0.5 rounded-full">to you</span>
                      )}
                    </div>
                    {alreadyAdded ? (
                      <span className="flex items-center gap-1 text-tiny text-brand font-medium">
                        <Check className="w-3.5 h-3.5" /> Added
                      </span>
                    ) : (
                      <button
                        onClick={() => applyRecipe(r)}
                        disabled={addingRecipe === r.name}
                        className="text-tiny font-semibold text-fg-muted hover:text-fg px-3 py-1 rounded-lg border border-white/[0.06] hover:border-line-strong transition-colors cursor-pointer disabled:opacity-40"
                      >
                        {addingRecipe === r.name ? "Adding…" : "Add"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Build your own card */}
          <button
            onClick={() => setCreating(true)}
            className="mt-3 w-full p-4 rounded-xl border border-dashed border-white/[0.08] hover:border-white/[0.16] bg-transparent hover:bg-white/[0.02] transition-colors cursor-pointer flex items-center justify-center gap-2 text-fg-muted hover:text-fg"
          >
            <Wrench className="w-4 h-4" />
            <span className="text-small font-medium">Customize your own automation</span>
          </button>
        </div>

        {/* ── Active automations ────────────────────────────────── */}
        {(loading || items.length > 0) && (
          <div>
            <p className="text-h3 text-fg font-semibold mb-4">Your automations</p>
            {loading ? (
              <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
            ) : (
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
                            <Badge tone={a.is_active ? "success" : "neutral"} dot>
                              {a.is_active ? "active" : "paused"}
                            </Badge>
                          </div>
                          {a.description && (
                            <p className="text-small text-fg-muted mt-0.5 line-clamp-1">{a.description}</p>
                          )}
                          <div className="flex flex-wrap items-center gap-2 mt-2 text-tiny text-fg-subtle">
                            <span>{T.label}</span>
                            <ArrowRight className="w-3 h-3" />
                            <span className={cn(
                              "flex items-center gap-1",
                              A.channel === "whatsapp" ? "text-[#25D366]" : "text-brand"
                            )}>
                              <A.icon className="w-3 h-3" />
                              {A.label}
                            </span>
                            <span className="ml-1 text-fg-faint">Fired {a.fire_count}×</span>
                            {a.last_fired_at && <span>· last {timeAgo(a.last_fired_at)}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <Button variant="ghost" size="icon" onClick={() => toggle(a)} title={a.is_active ? "Pause" : "Resume"}>
                            {a.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => remove(a)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
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
  const [delayMinutes, setDelayMinutes] = useState(String(initial?.trigger_config?.delay_minutes ?? 30));
  const [daysSince, setDaysSince] = useState(String(initial?.trigger_config?.days_since ?? 90));
  const [template, setTemplate] = useState(initial?.action_config?.template_body ?? "");
  const [active, setActive] = useState(initial?.is_active ?? false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const isOwnerAlert = action === "escalate" || action === "alert_email";

  const save = async () => {
    setErr(null);
    if (!name.trim()) return setErr("Name is required.");
    setSaving(true);

    const trigger_config: { delay_hours?: number; delay_minutes?: number; days_since?: number } = {};
    if (trigger === "recall_due" || trigger === "payment_due") {
      trigger_config.days_since = Number(daysSince);
    } else if (trigger === "job_starting_soon") {
      trigger_config.delay_minutes = Number(delayMinutes);
    } else {
      trigger_config.delay_hours = Number(delayHours);
    }

    const action_config: { template_body?: string } = {};
    if (template.trim()) action_config.template_body = template.trim();

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
      <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
        <Card className="w-full max-w-xl pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">{initial ? "Edit automation" : "Custom automation"}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer">
              <X className="w-4 h-4 text-fg-muted" />
            </button>
          </div>

          <div className="space-y-5">
            <Field label="Name">
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Day-before reminder" />
            </Field>

            {/* Trigger */}
            <div>
              <p className="text-small font-medium text-fg mb-2">When this happens</p>
              <div className="grid sm:grid-cols-2 gap-2">
                {(Object.keys(TRIGGERS) as TriggerType[]).map((t) => {
                  const T = TRIGGERS[t];
                  return (
                    <button
                      key={t}
                      onClick={() => setTrigger(t)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-3",
                        trigger === t
                          ? "border-brand bg-brand/[0.08]"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-line-strong"
                      )}
                    >
                      <T.icon className="w-4 h-4 text-fg-muted shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <p className="text-small font-semibold text-fg leading-snug">{T.label}</p>
                        <p className="text-tiny text-fg-muted">{T.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Delay config */}
            {trigger === "recall_due" || trigger === "payment_due" ? (
              <Field label="Days" hint="How many days after the trigger event">
                <Input type="number" min="1" value={daysSince} onChange={(e) => setDaysSince(e.target.value)} />
              </Field>
            ) : trigger === "job_starting_soon" ? (
              <Field label="Minutes before job starts" hint="e.g. 30 = alert fires 30 minutes before the job">
                <Input type="number" min="5" value={delayMinutes} onChange={(e) => setDelayMinutes(e.target.value)} />
              </Field>
            ) : (
              <Field
                label="Delay (hours)"
                hint="Positive = after the event. Negative = before (e.g. -24 for day-before reminder)."
              >
                <Input type="number" value={delayHours} onChange={(e) => setDelayHours(e.target.value)} />
              </Field>
            )}

            {/* Action */}
            <div>
              <p className="text-small font-medium text-fg mb-2">Do this</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(ACTIONS) as ActionType[]).map((a) => {
                  const A = ACTIONS[a];
                  return (
                    <button
                      key={a}
                      onClick={() => setAction(a)}
                      className={cn(
                        "p-3 rounded-xl border text-left transition-colors cursor-pointer flex items-start gap-2.5",
                        action === a
                          ? "border-brand bg-brand/[0.08]"
                          : "border-white/[0.06] bg-white/[0.02] hover:border-line-strong"
                      )}
                    >
                      <A.icon className={cn(
                        "w-4 h-4 shrink-0 mt-0.5",
                        A.channel === "whatsapp" ? "text-[#25D366]" : "text-brand"
                      )} />
                      <div className="min-w-0">
                        <p className="text-small font-semibold text-fg leading-snug">{A.label}</p>
                        <p className="text-tiny text-fg-muted">{A.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Message template */}
            <Field
              label={isOwnerAlert ? "Alert message" : "Message to customer"}
              hint={isOwnerAlert
                ? "Variables: {{customer}}, {{suburb}}, {{time}}, {{address}}, {{service}}"
                : "Variables: {{name}}, {{business}}, {{time}}, {{date}}, {{service}}, {{review_link}}"
              }
            >
              <Textarea
                rows={4}
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                placeholder={isOwnerAlert
                  ? "e.g. Job starting: {{customer}} in {{suburb}} at {{time}}"
                  : "e.g. Hi {{name}}, reminder about your appointment tomorrow at {{time}}."
                }
              />
            </Field>

            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="accent-brand w-4 h-4"
              />
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
      </div>
    </>
  );
}
