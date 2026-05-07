"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Trash2, X, Check, BookOpen, Upload, FileText, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/empty";
import { PageHeader } from "@/components/ui/page";
import { timeAgo } from "@/lib/format";
import { useClient } from "@/lib/use-client";

interface Article {
  id: string;
  client_id: number;
  title: string;
  body: string;
  is_active: boolean;
  updated_at: string;
}

interface KnowledgeSource {
  id: string;
  type: "paste" | "file" | "url" | "qa";
  original_filename: string | null;
  source_url: string | null;
  status: "processing" | "done" | "error";
  chunk_count: number | null;
  created_at: string;
}

export default function KnowledgePage() {
  const { client } = useClient();
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Article | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!client) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("kb_articles")
        .select("id, client_id, title, body, is_active, updated_at")
        .eq("client_id", client.id)
        .order("updated_at", { ascending: false });
      setArticles((data as Article[]) ?? []);
      setLoading(false);
    })();
  }, [client]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return articles;
    return articles.filter((a) => a.title.toLowerCase().includes(q) || a.body.toLowerCase().includes(q));
  }, [articles, query]);

  const remove = async (a: Article) => {
    if (!confirm(`Delete "${a.title}"?`)) return;
    await supabase.from("kb_articles").delete().eq("id", a.id);
    setArticles((list) => list.filter((x) => x.id !== a.id));
  };

  return (
    <>
      <PageHeader
        title="Knowledge"
        description="Answers your digital assistant uses. Questions customers ask, answers you'd give."
        actions={
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
            Add answer
          </Button>
        }
      />

      <div className="max-w-3xl space-y-6">
        <DocumentsSection />

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-fg-subtle" />
          <Input placeholder="Search…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-10" />
        </div>

        {loading ? (
          <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
        ) : filtered.length === 0 ? (
          <Card className="!p-8 text-center">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.06] flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-5 h-5 text-fg-muted" />
            </div>
            <p className="text-body font-semibold text-fg">{articles.length === 0 ? "No answers yet" : "No matches"}</p>
            <p className="text-small text-fg-muted mt-1 max-w-sm mx-auto">
              {articles.length === 0
                ? "Add three to five common questions. Hours, pricing and how to book are good starting points."
                : "Try a different search."}
            </p>
            {articles.length === 0 && (
              <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)} className="mt-5">
                Add first answer
              </Button>
            )}
          </Card>
        ) : (
          <div className="divide-y divide-line rounded-2xl border border-white/[0.06] bg-[#0D111A] overflow-hidden">
            {filtered.map((a) => (
              <div
                key={a.id}
                onClick={() => setEditing(a)}
                className="p-5 hover:bg-white/[0.02] cursor-pointer transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-body font-semibold text-fg">{a.title}</p>
                    <p className="text-small text-fg-muted line-clamp-2 mt-1">{a.body}</p>
                    <p className="text-tiny text-fg-subtle mt-2">Updated {timeAgo(a.updated_at)}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); remove(a); }}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {(creating || editing) && client && (
        <Editor
          clientId={client.id as unknown as number}
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
    </>
  );
}

function DocumentsSection() {
  const [sources, setSources] = useState<KnowledgeSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const r = await fetch("/api/knowledge/process");
      const j = await r.json();
      setSources((j.sources as KnowledgeSource[]) ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(",")[1] ?? "");
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });

  const upload = async (filesList: FileList | null) => {
    if (!filesList || filesList.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(filesList)) {
        if (file.size > 10 * 1024 * 1024) {
          setError(`${file.name} is over 10MB. Skipped.`);
          continue;
        }
        const base64 = await fileToBase64(file);
        const r = await fetch("/api/knowledge/process", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type:       "file",
            fileBase64: base64,
            fileType:   file.type,
            filename:   file.name,
          }),
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          setError(j.error ?? `Upload failed for ${file.name}`);
        }
      }
      await refresh();
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const remove = async (sourceId: string, label: string) => {
    if (!confirm(`Delete "${label}"?`)) return;
    await fetch(`/api/knowledge/process?sourceId=${encodeURIComponent(sourceId)}`, { method: "DELETE" });
    setSources((list) => list.filter((s) => s.id !== sourceId));
  };

  const fileSources = sources.filter((s) => s.type === "file");

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-body font-semibold text-fg flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand" />
            Documents &amp; certificates
          </h2>
          <p className="text-tiny text-fg-muted mt-1 max-w-xl">
            Upload your business documents, COC certificates, insurance, qualifications, price lists, brochures. Your assistant reads them and references the details when a visitor asks.
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Upload className="w-4 h-4" />}
          loading={uploading}
          onClick={() => fileInputRef.current?.click()}
        >
          Upload
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.doc,.docx"
          className="hidden"
          onChange={(e) => upload(e.target.files)}
        />
      </div>

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-danger/[0.08] border border-danger/25 mb-3">
          <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
          <p className="text-tiny text-danger">{error}</p>
        </div>
      )}

      {loading ? (
        <Skeleton className="h-16" />
      ) : fileSources.length === 0 ? (
        <p className="text-small text-fg-muted">No documents uploaded yet. Drop in a certificate or price list and your assistant will start referencing it on the chat.</p>
      ) : (
        <div className="divide-y divide-line rounded-xl border border-white/[0.06] bg-[#0D111A] overflow-hidden">
          {fileSources.map((s) => (
            <div key={s.id} className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-white/[0.04] border border-white/[0.06] flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-fg-muted" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-small font-medium text-fg truncate">{s.original_filename ?? "Untitled document"}</p>
                <p className="text-tiny text-fg-muted">
                  {s.status === "processing" && "Indexing…"}
                  {s.status === "done" && `${s.chunk_count ?? 0} sections indexed · ${timeAgo(s.created_at)}`}
                  {s.status === "error" && <span className="text-danger">Failed to index</span>}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(s.id, s.original_filename ?? "this document")}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

function Editor({
  clientId, initial, onClose, onSaved,
}: {
  clientId: number;
  initial: Article | null;
  onClose: () => void;
  onSaved: (a: Article) => void;
}) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!title.trim() || !body.trim()) return setErr("Question and answer are required.");
    setSaving(true);
    const payload = {
      client_id: clientId,
      title: title.trim(),
      body,
      is_active: true,
      is_public: true,
      updated_at: new Date().toISOString(),
    };
    const q = initial
      ? supabase.from("kb_articles").update(payload).eq("id", initial.id).select().single()
      : supabase.from("kb_articles").insert(payload).select().single();
    const { data, error } = await q;
    setSaving(false);
    if (error) return setErr(error.message);
    onSaved(data as Article);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto pointer-events-none">
        <Card className="w-full max-w-xl my-8 pointer-events-auto animate-slide-up">
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-h2 text-fg">{initial ? "Edit answer" : "Add answer"}</h2>
            <button onClick={onClose} aria-label="Close" className="w-11 h-11 flex items-center justify-center rounded-lg hover:bg-white/[0.06] cursor-pointer"><X className="w-4 h-4 text-fg-muted" /></button>
          </div>

          <div className="space-y-4">
            <Field label="Question"><Input placeholder="What are your operating hours?" value={title} onChange={(e) => setTitle(e.target.value)} /></Field>
            <Field label="Answer" hint="Write how you'd explain it in person.">
              <Textarea rows={6} placeholder="We're open Mon to Fri, 08:00 to 17:00…" value={body} onChange={(e) => setBody(e.target.value)} />
            </Field>
            {err && <p className="text-small text-danger">{err}</p>}
          </div>

          <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-white/[0.06]">
            <Button variant="ghost" onClick={onClose}>Cancel</Button>
            <Button variant="primary" loading={saving} icon={<Check className="w-4 h-4" />} onClick={save}>Save</Button>
          </div>
        </Card>
      </div>
    </>
  );
}
