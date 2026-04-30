"use client";

export const dynamic = "force-dynamic";

import { useState, useEffect, useMemo, ChangeEvent } from "react";
import {
  Save, Check, AlertCircle, Plus, Trash2, Search, BookOpen, X as XIcon,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient, ClientRow } from "@/lib/use-client";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Select, Field } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";
import { WebsiteAssistantTab } from "../_components/WebsiteAssistantTab";
import { cn } from "@/lib/cn";

const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;

type Hours = Record<string, [string, string] | null>;
type Toast = { msg: string; tone: "success" | "danger" };
type Client = NonNullable<ReturnType<typeof useClient>["client"]>;

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = (msg: string, tone: "success" | "danger" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

export default function AssistantPage() {
  const { toast, show } = useToast();
  const { client, setClient, loading, refresh } = useClient();
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <>
        <PageHeader title="Assistant" description="Personality, hours, and knowledge base." />
        <Card><p className="text-small text-fg-muted">Loading…</p></Card>
      </>
    );
  }
  if (!client) {
    return (
      <>
        <PageHeader title="Assistant" description="Personality, hours, and knowledge base." />
        <Card><p className="text-small text-fg-muted">No client found.</p></Card>
      </>
    );
  }

  const save = async (patch: Partial<Client>) => {
    setSaving(true);
    const { error } = await supabase.from("clients").update(patch).eq("id", client.id);
    setSaving(false);
    if (error) { show(error.message, "danger"); return; }
    setClient({ ...client, ...patch });
    show("Saved");
  };

  return (
    <>
      <PageHeader title="Assistant" description="How Qwikly answers, when it works, and what it knows." />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 panel-strong px-4 py-2.5 flex items-center gap-2 animate-slide-up">
          {toast.tone === "success"
            ? <Check className="w-4 h-4 text-success" />
            : <AlertCircle className="w-4 h-4 text-danger" />}
          <span className="text-small text-fg">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-8">
        <AICard client={client} save={save} saving={saving} />
        <HoursCard client={client} save={save} saving={saving} />
        <WebsiteAssistantTab client={client as unknown as ClientRow} onSave={refresh} />
        <KnowledgeSection clientId={client.id} />
      </div>
    </>
  );
}

// ─── AI personality card ──────────────────────────────────────────────────────

function AICard({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [tone, setTone] = useState(client.tone ?? "");
  const [areas, setAreas] = useState(client.address ?? "");
  const [prompt, setPrompt] = useState(client.system_prompt ?? "");
  const [faq, setFaq] = useState<{ q: string; a: string }[]>(client.faq ?? []);
  const [personality, setPersonality] = useState({
    ai_tone:                client.ai_tone                ?? "",
    ai_language:            client.ai_language            ?? "",
    ai_response_style:      client.ai_response_style      ?? "",
    ai_greeting:            client.ai_greeting            ?? "",
    ai_escalation_triggers: client.ai_escalation_triggers ?? "",
    ai_escalation_custom:   client.ai_escalation_custom   ?? "",
    ai_unhappy_customer:    client.ai_unhappy_customer     ?? "",
    ai_always_do:           client.ai_always_do            ?? "",
    ai_never_say:           client.ai_never_say            ?? "",
    ai_sign_off:            client.ai_sign_off             ?? "",
  });
  const setp = (k: keyof typeof personality) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setPersonality({ ...personality, [k]: e.target.value });

  const handleSave = () => save({
    tone,
    system_prompt: prompt,
    address: areas.trim() || null,
    faq,
    ...personality,
  } as Partial<Client>);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader title="Personality" description="How should your AI come across to customers?" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Overall tone">
            <Select value={tone} onChange={(e) => setTone(e.target.value)}>
              <option value="">Pick a tone</option>
              <option value="friendly">Friendly &amp; casual</option>
              <option value="professional">Polite &amp; professional</option>
              <option value="brief">Brief &amp; to the point</option>
              <option value="warm">Warm &amp; helpful</option>
            </Select>
          </Field>
          <Field label="AI tone (detailed)">
            <Input value={personality.ai_tone} onChange={setp("ai_tone")} placeholder="e.g. Confident but approachable" />
          </Field>
          <Field label="Language / dialect">
            <Input value={personality.ai_language} onChange={setp("ai_language")} placeholder="e.g. South African English" />
          </Field>
          <Field label="Response style">
            <Select value={personality.ai_response_style} onChange={setp("ai_response_style")}>
              <option value="">Select style</option>
              <option value="short">Short, punchy replies</option>
              <option value="detailed">Detailed and thorough</option>
              <option value="conversational">Conversational flow</option>
            </Select>
          </Field>
          <div className="md:col-span-2">
            <Field label="Opening greeting" hint="First message sent when a new customer messages in.">
              <Input value={personality.ai_greeting} onChange={setp("ai_greeting")} placeholder="e.g. Hi! Thanks for reaching out to Volt-Tech." />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Sign-off message">
              <Input value={personality.ai_sign_off} onChange={setp("ai_sign_off")} placeholder="e.g. Thanks again, we look forward to helping you!" />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader title="Escalation rules" description="When should the AI hand off to you?" />
        <div className="space-y-4">
          <Field label="Auto-escalation triggers">
            <Select value={personality.ai_escalation_triggers} onChange={setp("ai_escalation_triggers")}>
              <option value="">Select triggers</option>
              <option value="angry">Angry or frustrated customer</option>
              <option value="complex">Complex technical question</option>
              <option value="price">Pricing negotiation</option>
              <option value="all">All of the above</option>
              <option value="custom">Custom (specify below)</option>
            </Select>
          </Field>
          <Field label="Custom escalation rules">
            <Textarea value={personality.ai_escalation_custom} onChange={setp("ai_escalation_custom")} rows={3} placeholder="e.g. Always escalate if customer mentions insurance claims" />
          </Field>
          <Field label="How to handle an unhappy customer">
            <Textarea value={personality.ai_unhappy_customer} onChange={setp("ai_unhappy_customer")} rows={3} placeholder="e.g. Acknowledge the issue, apologise, offer callback within 30 minutes" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Hard rules" description="Non-negotiable behaviour instructions." />
        <div className="space-y-4">
          <Field label="Always do">
            <Textarea value={personality.ai_always_do} onChange={setp("ai_always_do")} rows={3} placeholder="e.g. Always confirm the area before booking, always mention the callout fee" />
          </Field>
          <Field label="Never say">
            <Textarea value={personality.ai_never_say} onChange={setp("ai_never_say")} rows={3} placeholder="e.g. Never give a fixed price before seeing the job" />
          </Field>
        </div>
      </Card>

      <Card>
        <CardHeader title="Service areas" description="Comma-separated suburbs or cities you cover." />
        <Input value={areas} onChange={(e) => setAreas(e.target.value)} placeholder="Sandton, Rosebank, Bryanston" />
      </Card>

      <Card>
        <CardHeader
          title="FAQ"
          description="Common questions and the exact answers your AI should give."
          action={<Button variant="secondary" size="sm" onClick={() => setFaq([...faq, { q: "", a: "" }])}>Add FAQ</Button>}
        />
        <div className="space-y-3">
          {faq.length === 0 && <p className="text-small text-fg-muted">No FAQs yet.</p>}
          {faq.map((f, i) => (
            <div key={i} className="grid md:grid-cols-[1fr_2fr_auto] gap-2 items-start">
              <Input placeholder="Question" value={f.q} onChange={(e) => {
                const next = [...faq]; next[i] = { ...f, q: e.target.value }; setFaq(next);
              }} />
              <Textarea placeholder="Answer" value={f.a} onChange={(e) => {
                const next = [...faq]; next[i] = { ...f, a: e.target.value }; setFaq(next);
              }} rows={2} className="!min-h-[44px]" />
              <Button variant="ghost" size="icon" onClick={() => setFaq(faq.filter((_, j) => j !== i))}>
                <XIcon className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <CardHeader title="Full system prompt" description="Advanced: the raw instructions your AI runs on." />
        <Textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} rows={16} placeholder="Your business setup answers will appear here after completing setup." />
      </Card>

      <div className="flex justify-end">
        <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={handleSave}>Update AI knowledge</Button>
      </div>
    </div>
  );
}

// ─── Hours card ───────────────────────────────────────────────────────────────

function HoursCard({ client, save, saving }: { client: Client; save: (p: Partial<Client>) => void; saving: boolean }) {
  const [hours, setHours] = useState<Hours>(() => {
    const base: Hours = {};
    DAYS.forEach((d) => { base[d] = client.hours?.[d] ?? ["08:00", "17:00"]; });
    return base;
  });
  const toggle = (d: string) => setHours({ ...hours, [d]: hours[d] ? null : ["08:00", "17:00"] });

  return (
    <Card>
      <CardHeader title="Working hours" description="When can the AI book customers in?" />
      <div className="space-y-2">
        {DAYS.map((d) => {
          const open = !!hours[d];
          return (
            <div key={d} className="grid grid-cols-[80px_80px_1fr_1fr] gap-3 items-center py-2 border-b border-[var(--border)] last:border-0">
              <p className="text-body text-fg capitalize font-medium">{d}</p>
              <button
                onClick={() => toggle(d)}
                className={cn(
                  "h-7 px-2.5 rounded-lg text-tiny font-semibold cursor-pointer",
                  open ? "bg-ember/10 text-ember border border-ember/30" : "bg-surface-input text-fg-muted border border-[var(--border)]"
                )}
              >
                {open ? "Open" : "Closed"}
              </button>
              {open && hours[d] ? (
                <>
                  <Input type="time" value={hours[d]![0]} onChange={(e) => setHours({ ...hours, [d]: [e.target.value, hours[d]![1]] })} className="!h-9 !py-1.5" />
                  <Input type="time" value={hours[d]![1]} onChange={(e) => setHours({ ...hours, [d]: [hours[d]![0], e.target.value] })} className="!h-9 !py-1.5" />
                </>
              ) : (
                <div className="col-span-2 text-tiny text-fg-subtle">No appointments</div>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-end mt-5">
        <Button loading={saving} icon={<Save className="w-4 h-4" />} onClick={() => save({ hours } as Partial<Client>)}>Save hours</Button>
      </div>
    </Card>
  );
}

// ─── Knowledge section ────────────────────────────────────────────────────────

interface KbArticle {
  id: string;
  client_id: number;
  title: string;
  body: string;
  is_active: boolean;
  updated_at: string;
}

function KnowledgeSection({ clientId }: { clientId: string }) {
  const [articles, setArticles] = useState<KbArticle[]>([]);
  const [loadingK, setLoadingK] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<KbArticle | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    (async () => {
      setLoadingK(true);
      const { data } = await supabase
        .from("kb_articles")
        .select("id, client_id, title, body, is_active, updated_at")
        .eq("client_id", clientId)
        .order("updated_at", { ascending: false });
      setArticles((data as KbArticle[]) ?? []);
      setLoadingK(false);
    })();
  }, [clientId]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
  }, [articles, query]);

  const remove = async (a: KbArticle) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    await supabase.from("kb_articles").delete().eq("id", a.id);
    setArticles((list) => list.filter((x) => x.id !== a.id));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-h2 text-fg">Q&amp;A</p>
          <p className="text-small text-fg-muted mt-0.5">Answers your digital assistant uses for common questions.</p>
        </div>
        <Button variant="primary" size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
          Add answer
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
        <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
      </div>

      {loadingK ? (
        <div className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-20 rounded-xl bg-surface-input animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="!p-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-surface-input border border-[var(--border)] flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-5 h-5 text-fg-muted" />
          </div>
          <p className="text-body font-semibold text-fg">{articles.length === 0 ? "No answers yet" : "No matches"}</p>
          <p className="text-small text-fg-muted mt-1 max-w-sm mx-auto">
            {articles.length === 0
              ? "Add common questions. Opening hours, pricing, and how to book are good starting points."
              : "Try a different search."}
          </p>
          {articles.length === 0 && (
            <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)} className="mt-5">
              Add first answer
            </Button>
          )}
        </Card>
      ) : (
        <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-surface-card overflow-hidden">
          {filtered.map((a) => (
            <div key={a.id} onClick={() => setEditing(a)} className="p-5 hover:bg-surface-hover cursor-pointer transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <p className="text-body font-semibold text-fg">{a.title}</p>
                  <p className="text-small text-fg-muted line-clamp-2 mt-1">{a.body}</p>
                </div>
                <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(a); }}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <KbEditor
          clientId={clientId as unknown as number}
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSaved={(a) => {
            setArticles((list) => {
              const exists = list.some((x) => x.id === a.id);
              return exists ? list.map((x) => (x.id === a.id ? a : x)) : [a, ...list];
            });
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

function KbEditor({ clientId, initial, onClose, onSaved }: {
  clientId: number;
  initial: KbArticle | null;
  onClose: () => void;
  onSaved: (a: KbArticle) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [savingK, setSavingK] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!title.trim() || !body.trim()) return setErr("Question and answer are required.");
    setSavingK(true);
    const payload = { client_id: clientId, title: title.trim(), body, is_active: true, is_public: true, updated_at: new Date().toISOString() };
    const q = initial
      ? supabase.from("kb_articles").update(payload).eq("id", initial.id).select().single()
      : supabase.from("kb_articles").insert(payload).select().single();
    const { data, error } = await q;
    setSavingK(false);
    if (error) return setErr(error.message);
    onSaved(data as KbArticle);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
        <Card className="w-full max-w-xl my-8 pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">{initial ? "Edit answer" : "Add answer"}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover cursor-pointer">
              <XIcon className="w-4 h-4 text-fg-muted" />
            </button>
          </div>
          <div className="space-y-4">
            <Field label="Question"><Input placeholder="What are your operating hours?" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Answer" hint="Write how you'd explain it in person.">
              <Textarea rows={6} placeholder="We're open Mon to Fri, 08:00 to 17:00…" value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            {err && <p className="text-small text-danger">{err}</p>}
          </div>
          <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-[var(--border)]">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={savingK} icon={<Check className="w-4 h-4" />} onClick={save}>Save</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
