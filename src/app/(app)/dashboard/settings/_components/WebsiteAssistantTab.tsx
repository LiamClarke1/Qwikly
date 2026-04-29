"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { ClientRow } from "@/lib/use-client";
import {
  CheckCircle2, AlertTriangle, Copy, CheckCheck,
  ExternalLink, Loader2, Globe, RefreshCw,
} from "lucide-react";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { WidgetPreview } from "@/app/(app)/onboarding/website/_components/WidgetPreview";

interface Props {
  client: ClientRow;
  onSave: () => Promise<void>;
}

const PLATFORMS = ["Wix", "Squarespace", "WordPress", "Webflow", "Shopify", "Custom HTML"];

export function WebsiteAssistantTab({ client, onSave }: Props) {
  const [color, setColor] = useState(client.web_widget_color ?? "#E85A2C");
  const [greeting, setGreeting] = useState(client.web_widget_greeting ?? "");
  const [label, setLabel] = useState(client.web_widget_launcher_label ?? "Message us");
  const [position, setPosition] = useState<"bottom-right" | "bottom-left">(
    (client.web_widget_position as "bottom-right" | "bottom-left") ?? "bottom-right"
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifyResult, setVerifyResult] = useState<{ ok: boolean; msg: string } | null>(null);

  const status = client.web_widget_status ?? "pending";
  const snippet = `<script src="https://embed.qwikly.co.za/v1/widget.js"\n        data-client="${client.id}"\n        defer></script>`;

  function copySnippet() {
    navigator.clipboard.writeText(snippet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    await supabase.from("clients").update({
      web_widget_color: color,
      web_widget_greeting: greeting || null,
      web_widget_launcher_label: label,
      web_widget_position: position,
    }).eq("id", client.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
    await onSave();
  }

  async function reverify() {
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await fetch("/api/onboarding/verify-install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id }),
      });
      const data = await res.json();
      setVerifyResult({
        ok: data.verified,
        msg: data.verified
          ? "Widget confirmed live on your site."
          : "Widget not found. Check your site is published with the latest code.",
      });
      if (data.verified) await onSave();
    } catch {
      setVerifyResult({ ok: false, msg: "Network error. Try again." });
    }
    setVerifying(false);
  }

  const resolvedGreeting = (greeting || client.web_widget_greeting || "Hi! How can I help?")
    .replace(/\{name\}/g, "Sarah")
    .replace(/\{business\}/g, client.business_name ?? "your business");

  return (
    <div className="space-y-8 max-w-4xl">
      {/* ── Status block ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 rounded-xl border border-border bg-bg-elevated">
        {status === "verified"
          ? <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
          : <AlertTriangle className="w-5 h-5 text-warning shrink-0" />
        }
        <div className="flex-1 min-w-0">
          <p className="text-fg font-semibold text-sm">
            {status === "verified"
              ? `Live on ${client.web_widget_domain}`
              : client.web_widget_domain
                ? `Pending — not yet verified on ${client.web_widget_domain}`
                : "Widget not configured — run setup wizard"
            }
          </p>
          {client.web_widget_verified_at && (
            <p className="text-fg-subtle text-xs mt-0.5">
              Last verified {new Date(client.web_widget_verified_at).toLocaleDateString("en-ZA")}
            </p>
          )}
          {verifyResult && (
            <p className={`text-xs mt-1 font-medium ${verifyResult.ok ? "text-success" : "text-danger"}`}>
              {verifyResult.msg}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          <Badge tone={status === "verified" ? "success" : "warning"}>
            {status === "verified" ? "Live" : status === "disconnected" ? "Disconnected" : "Pending"}
          </Badge>
          {client.web_widget_domain && (
            <Button
              variant="ghost"
              size="sm"
              onClick={reverify}
              disabled={verifying}
              icon={verifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
            >
              {verifying ? "Checking…" : "Reverify"}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            icon={<ExternalLink className="w-3.5 h-3.5" />}
            onClick={() => window.open("/onboarding/website", "_blank")}
          >
            Setup wizard
          </Button>
        </div>
      </div>

      {/* ── Appearance + live preview ── */}
      <div>
        <h3 className="text-fg font-semibold text-h2 mb-5">Appearance</h3>
        <div className="grid md:grid-cols-2 gap-8 items-start">
          <div className="space-y-5">
            <Field label="Accent colour">
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="flex-1 font-mono uppercase"
                  maxLength={7}
                />
              </div>
            </Field>

            <Field label="Greeting message" hint="Use {name} for visitor name, {business} for your business name.">
              <Textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                rows={3}
                placeholder="Hi {name}! How can I help?"
              />
            </Field>

            <Field label="Launcher button text">
              <Input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Message us"
              />
            </Field>

            <Field label="Widget position">
              <div className="flex gap-3">
                {(["bottom-right", "bottom-left"] as const).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPosition(p)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium cursor-pointer transition-all ${
                      position === p
                        ? "border-brand/40 bg-brand/5 text-brand"
                        : "border-border text-fg-muted hover:border-fg-muted"
                    }`}
                  >
                    {p === "bottom-right" ? "Bottom right" : "Bottom left"}
                  </button>
                ))}
              </div>
            </Field>

            <Button
              onClick={save}
              disabled={saving}
              className="w-full justify-center"
              icon={saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <CheckCheck className="w-4 h-4" /> : undefined}
            >
              {saving ? "Saving…" : saved ? "Saved!" : "Save changes"}
            </Button>
          </div>

          <div>
            <p className="text-fg-subtle text-xs font-semibold uppercase tracking-wider mb-3">Live preview</p>
            <WidgetPreview
              color={color}
              greeting={resolvedGreeting}
              launcherLabel={label}
              position={position}
              businessName={client.business_name ?? ""}
            />
          </div>
        </div>
      </div>

      {/* ── Install snippet ── */}
      <div>
        <h3 className="text-fg font-semibold text-h2 mb-4">Install code</h3>
        <p className="text-fg-muted text-sm mb-4">
          This goes in your site&rsquo;s code once — after that, changes you make here apply automatically.
        </p>
        <div className="relative bg-bg-elevated border border-border rounded-xl p-5 font-mono">
          <pre className="text-fg-muted text-sm whitespace-pre-wrap break-all pr-20 leading-relaxed">
            {snippet}
          </pre>
          <button
            onClick={copySnippet}
            className="absolute top-4 right-4 flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold px-3 py-2 rounded-lg cursor-pointer transition-colors border-0"
          >
            {copied ? <CheckCheck className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mt-4">
          {PLATFORMS.map((p) => (
            <span
              key={p}
              className="px-3 py-1.5 text-xs font-medium text-fg-muted bg-bg-elevated border border-border rounded-full"
            >
              {p}
            </span>
          ))}
        </div>
        <p className="text-fg-subtle text-xs mt-2">
          Need step-by-step instructions?{" "}
          <a href="/onboarding/website" className="text-brand hover:underline cursor-pointer">
            Re-run the setup wizard →
          </a>
        </p>
      </div>
    </div>
  );
}
