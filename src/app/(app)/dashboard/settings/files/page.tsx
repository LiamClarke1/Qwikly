"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { Check, Upload, Send } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";
import { cn } from "@/lib/cn";

type Toast = { msg: string; tone: "success" | "danger" };

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = (msg: string, tone: Toast["tone"] = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

const ALLOWED_TYPES = [
  { mime: "application/pdf",    label: "PDF",  ext: ".pdf" },
  { mime: "image/jpeg",         label: "JPG",  ext: ".jpg" },
  { mime: "image/png",          label: "PNG",  ext: ".png" },
  { mime: "image/webp",         label: "WebP", ext: ".webp" },
  { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "DOCX", ext: ".docx" },
];

const SIZE_OPTIONS = [5, 10, 15, 25];

export default function FilesSettingsPage() {
  const { client, setClient, loading } = useClient();
  const { toast, show } = useToast();
  const [saving, setSaving] = useState(false);

  if (loading) {
    return (
      <>
        <PageHeader title="Files & Documents" description="Configure document sharing in your digital assistant." />
        <div className="space-y-4 animate-pulse">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-2xl border border-[var(--border)] bg-surface-card p-5">
              <div className="h-4 w-40 bg-surface-input rounded-lg mb-3" />
              <div className="h-20 bg-surface-input rounded-xl" />
            </div>
          ))}
        </div>
      </>
    );
  }

  if (!client) {
    return (
      <>
        <PageHeader title="Files & Documents" description="Configure document sharing in your digital assistant." />
        <Card><p className="text-small text-fg-muted">No client found.</p></Card>
      </>
    );
  }

  const visitorUpload = client.doc_visitor_upload  ?? true;
  const businessSend  = client.doc_business_send   ?? false;
  const allowedTypes  = client.doc_allowed_types   ?? ["application/pdf", "image/jpeg", "image/png"];
  const maxSizeMb     = client.doc_max_size_mb     ?? 10;
  const visitorPrompt = client.doc_visitor_prompt  ?? "";
  const businessLabel = client.doc_business_send_label ?? "";

  const save = async (patch: Partial<typeof client>) => {
    setSaving(true);
    const { error } = await supabase.from("clients").update(patch).eq("id", client.id);
    setSaving(false);
    if (error) { show(error.message, "danger"); return; }
    setClient({ ...client, ...patch });
    show("Saved");
  };

  const toggleType = (mime: string) => {
    const next = allowedTypes.includes(mime)
      ? allowedTypes.filter((t) => t !== mime)
      : [...allowedTypes, mime];
    save({ doc_allowed_types: next });
  };

  return (
    <>
      <PageHeader
        title="Files & Documents"
        description="Let visitors upload files through your digital assistant, and send documents directly to visitors."
      />

      {toast && (
        <div className={cn(
          "fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl shadow-pop text-sm font-medium",
          toast.tone === "success" ? "bg-success text-white" : "bg-danger text-white"
        )}>
          {toast.tone === "success" && <Check className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <div className="space-y-5">

        {/* Visitor uploads */}
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><Upload className="w-4 h-4 text-ember" />Visitor uploads</span>}
            description="Allow people on your website to send files through the chat widget."
          />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small font-medium text-fg">Enable visitor uploads</p>
                <p className="text-tiny text-fg-muted mt-0.5">Shows a + button in the chat widget</p>
              </div>
              <button
                onClick={() => save({ doc_visitor_upload: !visitorUpload })}
                className={cn(
                  "relative w-10 h-5.5 rounded-full transition-colors duration-200 cursor-pointer shrink-0",
                  visitorUpload ? "bg-success" : "bg-surface-input border border-[var(--border-strong)]"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                  visitorUpload ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </div>

            {visitorUpload && (
              <>
                <Field label="Prompt shown to visitor (optional)">
                  <input
                    type="text"
                    defaultValue={visitorPrompt}
                    placeholder="e.g. Please upload your proof of address"
                    onBlur={(e) => save({ doc_visitor_prompt: e.target.value.trim() || null })}
                    className="w-full h-9 px-3 text-small bg-surface-input border border-[var(--border)] rounded-xl outline-none focus:border-ember/50 transition-colors"
                  />
                </Field>

                <div>
                  <p className="text-small font-medium text-fg mb-2">Allowed file types</p>
                  <div className="flex flex-wrap gap-2">
                    {ALLOWED_TYPES.map(({ mime, label }) => (
                      <button
                        key={mime}
                        type="button"
                        onClick={() => toggleType(mime)}
                        className={cn(
                          "px-3 h-7 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer",
                          allowedTypes.includes(mime)
                            ? "bg-ember text-paper border-ember"
                            : "bg-surface-input text-fg-muted border-[var(--border)] hover:border-[var(--border-strong)]"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-small font-medium text-fg mb-2">Maximum file size</p>
                  <div className="flex gap-2">
                    {SIZE_OPTIONS.map((mb) => (
                      <button
                        key={mb}
                        type="button"
                        onClick={() => save({ doc_max_size_mb: mb })}
                        className={cn(
                          "px-3 h-7 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer",
                          maxSizeMb === mb
                            ? "bg-ember text-paper border-ember"
                            : "bg-surface-input text-fg-muted border-[var(--border)] hover:border-[var(--border-strong)]"
                        )}
                      >
                        {mb} MB
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Business sends documents */}
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><Send className="w-4 h-4 text-ember" />Send documents to visitors</span>}
            description="Attach and send files (quotes, invoices, specs) from your conversations view."
          />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-small font-medium text-fg">Enable document sending</p>
                <p className="text-tiny text-fg-muted mt-0.5">Adds a paperclip button in the chat composer</p>
              </div>
              <button
                onClick={() => save({ doc_business_send: !businessSend })}
                className={cn(
                  "relative w-10 h-5.5 rounded-full transition-colors duration-200 cursor-pointer shrink-0",
                  businessSend ? "bg-success" : "bg-surface-input border border-[var(--border-strong)]"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                  businessSend ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </div>

            {businessSend && (
              <Field label="Message sent with every document (optional)">
                <input
                  type="text"
                  defaultValue={businessLabel}
                  placeholder="e.g. Your quote is ready — click below to download."
                  onBlur={(e) => save({ doc_business_send_label: e.target.value.trim() || null })}
                  className="w-full h-9 px-3 text-small bg-surface-input border border-[var(--border)] rounded-xl outline-none focus:border-ember/50 transition-colors"
                />
              </Field>
            )}
          </div>
        </Card>

      </div>
    </>
  );
}
