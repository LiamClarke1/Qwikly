"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { FileText, Image as ImageIcon, Download, Trash2, X, AlertTriangle, Paperclip } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/ui/page";
import { EmptyState, Skeleton } from "@/components/ui/empty";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { format } from "date-fns";
import Link from "next/link";

interface ConvDoc {
  id: string;
  client_id: number;
  conversation_id: string;
  uploaded_by: "business" | "visitor";
  file_name: string;
  file_size: number;
  file_type: string;
  status: "active" | "deleted";
  created_at: string;
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const [docs, setDocs] = useState<ConvDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "visitor" | "business">("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("conversation_documents")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      setDocs((data as ConvDoc[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = filter === "all" ? docs : docs.filter((d) => d.uploaded_by === filter);

  const downloadDoc = async (docId: string) => {
    const r = await fetch(`/api/documents/${docId}/url`);
    if (!r.ok) return;
    const { url } = await r.json();
    if (url) window.open(url, "_blank", "noopener");
  };

  const deleteDoc = async (docId: string) => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const r = await fetch(`/api/documents/${docId}`, { method: "DELETE" });
      if (r.ok) {
        setDocs((d) => d.filter((x) => x.id !== docId));
      } else {
        const j = await r.json().catch(() => ({}));
        setDeleteError(j.error ?? "Delete failed");
      }
    } catch {
      setDeleteError("Network error — could not delete.");
    } finally {
      setDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <>
      <PageHeader
        title="Documents"
        description="All files shared through your digital assistant, in both directions."
      />

      {deleteError && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 mb-3 rounded-xl bg-danger/8 border border-danger/20">
          <AlertTriangle className="w-4 h-4 text-danger shrink-0" />
          <p className="text-small text-danger flex-1">{deleteError}</p>
          <button onClick={() => setDeleteError(null)} className="text-danger/60 hover:text-danger cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Filter chips */}
      <div className="flex gap-2 mb-4">
        {(["all", "visitor", "business"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "px-3 h-7 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer",
              filter === f
                ? "bg-ember text-paper border-ember"
                : "bg-surface-input text-fg-muted border-[var(--border)] hover:border-[var(--border-strong)]"
            )}
          >
            {f === "all" ? "All" : f === "visitor" ? "From visitors" : "Sent by you"}
          </button>
        ))}
        <span className="ml-auto text-[11px] text-fg-muted self-center">{filtered.length} file{filtered.length !== 1 ? "s" : ""}</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="No documents yet"
          description={
            filter === "all"
              ? "Files shared through your digital assistant will appear here."
              : filter === "visitor"
              ? "No files have been uploaded by visitors yet."
              : "No files have been sent by you yet."
          }
        />
      ) : (
        <div className="space-y-1.5">
          {filtered.map((doc) => {
            const isImg = doc.file_type?.startsWith("image/");
            const isConfirming = deleteId === doc.id;
            return (
              <div
                key={doc.id}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors",
                  isConfirming
                    ? "bg-danger/5 border-danger/20"
                    : "bg-surface-card border-[var(--border)] hover:border-[var(--border-strong)]"
                )}
              >
                <div className="w-9 h-9 rounded-lg bg-surface-input border border-[var(--border)] flex items-center justify-center shrink-0">
                  {isImg ? <ImageIcon className="w-4 h-4 text-fg-muted" /> : <FileText className="w-4 h-4 text-fg-muted" />}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-small font-semibold text-fg truncate">{doc.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <span className="text-[10px] text-fg-faint">{formatBytes(doc.file_size)}</span>
                    <span className="text-[10px] text-fg-faint">·</span>
                    <span className={cn("text-[10px] font-medium", doc.uploaded_by === "visitor" ? "text-violet-600 dark:text-violet-400" : "text-ember")}>
                      {doc.uploaded_by === "visitor" ? "From visitor" : "Sent by you"}
                    </span>
                    <span className="text-[10px] text-fg-faint">·</span>
                    <Link
                      href={`/dashboard/conversations?id=${doc.conversation_id}`}
                      className="text-[10px] text-fg-muted hover:text-ember transition-colors"
                    >
                      View conversation
                    </Link>
                    <span className="text-[10px] text-fg-faint ml-auto num">{format(new Date(doc.created_at), "d MMM yyyy, HH:mm")}</span>
                  </div>
                </div>

                {isConfirming ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-danger font-medium">Delete?</span>
                    <button onClick={() => setDeleteId(null)} className="text-[11px] text-fg-muted hover:text-fg cursor-pointer">Cancel</button>
                    <button
                      onClick={() => deleteDoc(doc.id)}
                      disabled={deleting}
                      className="text-[11px] font-semibold text-danger hover:text-danger/80 cursor-pointer disabled:opacity-50"
                    >
                      {deleting ? "…" : "Yes"}
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => downloadDoc(doc.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-fg-subtle hover:text-ember hover:bg-ember/10 cursor-pointer transition-colors"
                      title="Download"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setDeleteId(doc.id)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-fg-subtle hover:text-danger hover:bg-danger/10 cursor-pointer transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
