"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientRow } from "@/lib/use-client";
import { Loader2, CheckCircle2, AlertTriangle, Globe } from "lucide-react";
import { Input, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Props {
  client: ClientRow;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

function extractDomain(url: string): string | null {
  try { return new URL(url).hostname; } catch { return null; }
}

function normalise(url: string): string {
  if (!url) return "";
  return url.startsWith("http") ? url : `https://${url}`;
}

export default function StepWebsite({ client, onAdvance, onBack }: Props) {
  const [url, setUrl] = useState(
    client.web_widget_domain ? `https://${client.web_widget_domain}` : ""
  );
  const [checking, setChecking] = useState(false);
  const [preview, setPreview] = useState<{ title: string; reachable: boolean } | null>(null);
  const [confirmed, setConfirmed] = useState(!!client.web_widget_domain);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkUrl() {
    setError(null);
    if (!url.trim()) { setError("Please enter your website URL."); return; }
    const norm = normalise(url.trim());
    if (!extractDomain(norm)) { setError("Please enter a valid URL, e.g. https://yoursite.co.za"); return; }
    setChecking(true);
    setPreview(null);
    setConfirmed(false);
    try {
      const res = await fetch(`/api/onboarding/site-preview?url=${encodeURIComponent(norm)}`);
      const data = await res.json();
      setPreview({ title: data.title ?? extractDomain(norm) ?? norm, reachable: !!data.reachable });
    } catch {
      setPreview({ title: extractDomain(norm) ?? norm, reachable: false });
    }
    setChecking(false);
  }

  async function handleContinue() {
    setError(null);
    const norm = normalise(url.trim());
    const domain = extractDomain(norm);
    if (!domain) { setError("Please enter a valid URL."); return; }
    setSaving(true);
    const { error: dbErr } = await supabase.from("clients").update({
      web_widget_domain: domain,
    }).eq("id", client.id);
    setSaving(false);
    if (dbErr) { setError(dbErr.message); return; }
    await onAdvance();
  }

  const canContinue = !!url.trim() && (confirmed || !!preview || !!client.web_widget_domain);

  return (
    <div className="pt-10 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">
        Where should we install your assistant?
      </h1>
      <p className="text-fg-muted text-body mb-8">
        Enter your website URL — we&rsquo;ll confirm we can reach it before you continue.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <div className="space-y-4">
        <Field label="Your website URL">
          <div className="flex gap-2">
            <Input
              value={url}
              onChange={(e) => { setUrl(e.target.value); setPreview(null); setConfirmed(false); }}
              onKeyDown={(e) => e.key === "Enter" && checkUrl()}
              placeholder="https://yoursite.co.za"
              className="flex-1"
            />
            <Button
              type="button"
              variant="secondary"
              onClick={checkUrl}
              disabled={checking || !url.trim()}
            >
              {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "Check"}
            </Button>
          </div>
        </Field>

        {preview && (
          <div className="p-4 rounded-xl border border-border bg-bg-elevated">
            <div className="flex items-start gap-3">
              {preview.reachable
                ? <CheckCircle2 className="w-5 h-5 text-success mt-0.5 shrink-0" />
                : <AlertTriangle className="w-5 h-5 text-warning mt-0.5 shrink-0" />
              }
              <div className="flex-1 min-w-0">
                <p className="text-fg font-medium text-sm truncate">{preview.title}</p>
                <p className="text-fg-muted text-xs mt-0.5">
                  {preview.reachable
                    ? "We can reach your site."
                    : "Couldn't reach your site — you can still continue."}
                </p>
                {!confirmed ? (
                  <button
                    onClick={() => setConfirmed(true)}
                    className="mt-2 text-brand text-xs font-semibold hover:underline cursor-pointer"
                  >
                    Yes, this is my website →
                  </button>
                ) : (
                  <p className="mt-2 text-success text-xs font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Confirmed
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {client.web_widget_domain && !preview && (
          <div className="p-3 rounded-xl border border-border bg-bg-elevated flex items-center gap-3">
            <Globe className="w-4 h-4 text-fg-muted shrink-0" />
            <p className="text-fg-muted text-sm">Current: {client.web_widget_domain}</p>
          </div>
        )}
      </div>

      <div className="flex gap-3 mt-8">
        <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
        <Button
          type="button"
          onClick={handleContinue}
          disabled={saving || !canContinue}
          className="flex-1 justify-center"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Continue →"}
        </Button>
      </div>
    </div>
  );
}
