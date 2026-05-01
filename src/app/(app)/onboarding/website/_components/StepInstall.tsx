"use client";

import { useState, useEffect, useRef } from "react";
import { ClientRow } from "@/lib/use-client";
import { Copy, CheckCheck, PhoneCall, CheckCircle2, Mail, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { type PlanTier } from "@/lib/plan";

interface Props {
  client: ClientRow;
  plan: PlanTier;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

const PLATFORMS = [
  { id: "wix",         label: "Wix" },
  { id: "squarespace", label: "Squarespace" },
  { id: "wordpress",   label: "WordPress" },
  { id: "webflow",     label: "Webflow" },
  { id: "shopify",     label: "Shopify" },
  { id: "custom",      label: "Custom HTML" },
];

const INSTRUCTIONS: Record<string, { steps: string[]; note?: string }> = {
  wix: {
    steps: [
      "Open your Wix dashboard and click Settings in the left menu.",
      "Click Custom Code (under Advanced).",
      "Click + Add Custom Code.",
      "Paste the snippet into the code box.",
      "Set 'Add Code to Pages' → All pages.",
      "Set 'Place Code in' → Body — end.",
      "Click Apply. Then publish your site.",
    ],
  },
  squarespace: {
    steps: [
      "Go to your Squarespace dashboard.",
      "Click Settings → Advanced → Code Injection.",
      "Paste the snippet into the Footer section.",
      "Click Save. Then publish your site.",
    ],
  },
  wordpress: {
    steps: [
      "Install the 'Insert Headers and Footers' plugin (free on WordPress.org).",
      "Go to Settings → Insert Headers and Footers.",
      "Paste the snippet into the 'Scripts in Footer' box.",
      "Click Save.",
    ],
  },
  webflow: {
    steps: [
      "Open your Webflow project and go to Project Settings.",
      "Click the Custom Code tab.",
      "Paste the snippet into the Footer Code field.",
      "Click Save Changes, then Publish your site.",
    ],
  },
  shopify: {
    steps: [
      "From your Shopify admin, go to Online Store → Themes.",
      "Click Actions → Edit Code on your active theme.",
      "Open theme.liquid and find the closing </body> tag.",
      "Paste the snippet just before </body>.",
      "Click Save.",
    ],
  },
  custom: {
    steps: [
      "Open your site's main HTML file in any code editor.",
      "Find the closing </body> tag near the bottom.",
      "Paste the snippet just before </body>.",
      "Save and upload to your server.",
    ],
    note: "Works with any static site, cPanel, or FTP-managed hosting.",
  },
};

export default function StepInstall({ client, plan, onAdvance, onBack }: Props) {
  const [platform, setPlatform] = useState("wix");
  const [copied, setCopied] = useState(false);
  const [detected, setDetected] = useState(
    !!client.web_widget_last_seen_at || client.web_widget_status === "verified"
  );
  const [emailSent, setEmailSent] = useState(false);
  const [emailLoading, setEmailLoading] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const publicKey = client.public_key ?? client.id;
  const snippet = `<script src="https://embed.qwikly.co.za/v1/widget.js"\n        data-key="${publicKey}"\n        defer></script>`;

  // Poll for widget detection every 5 s
  useEffect(() => {
    if (detected) return;
    intervalRef.current = setInterval(async () => {
      const { data } = await supabase
        .from("clients")
        .select("web_widget_last_seen_at, web_widget_status")
        .eq("id", client.id)
        .maybeSingle();
      if (data?.web_widget_last_seen_at || data?.web_widget_status === "verified") {
        setDetected(true);
        if (intervalRef.current) clearInterval(intervalRef.current);
      }
    }, 5000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detected]);

  function copySnippet() {
    navigator.clipboard.writeText(snippet).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  async function emailSnippet() {
    setEmailLoading(true);
    try {
      await fetch("/api/onboarding/email-snippet", { method: "POST" });
    } catch {
      // non-blocking — backend contract listed below
    }
    setEmailLoading(false);
    setEmailSent(true);
    setTimeout(() => setEmailSent(false), 4000);
  }

  const { steps, note } = INSTRUCTIONS[platform] ?? { steps: [], note: undefined };

  return (
    <div className="pt-10 max-w-2xl">
      <h1 className="text-display-1 font-semibold text-fg mb-2">
        Add this one line to your website.
      </h1>
      <p className="text-fg-muted text-body mb-6">
        Copy the snippet and paste it into your site. Your assistant goes live immediately.
      </p>

      {/* Snippet box */}
      <div className="relative bg-bg-elevated border border-border rounded-xl p-5 mb-3 font-mono">
        <pre className="text-fg-muted text-sm whitespace-pre-wrap break-all leading-relaxed pr-20">
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

      {/* Email snippet */}
      <div className="mb-6">
        <button
          type="button"
          onClick={emailSnippet}
          disabled={emailLoading || emailSent}
          className="flex items-center gap-2 text-small text-fg-muted hover:text-fg transition-colors duration-150 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {emailLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : emailSent ? (
            <CheckCheck className="w-3.5 h-3.5 text-success" />
          ) : (
            <Mail className="w-3.5 h-3.5" />
          )}
          {emailSent ? "Sent to your inbox" : "Email me the snippet"}
        </button>
      </div>

      {/* Platform tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {PLATFORMS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlatform(p.id)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors cursor-pointer border-0 ${
              platform === p.id
                ? "bg-brand text-white"
                : "bg-bg-elevated text-fg-muted hover:text-fg border border-border"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Step-by-step */}
      <div className="bg-bg-elevated border border-border rounded-xl p-5 mb-6">
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={i} className="flex gap-3 text-sm text-fg-muted">
              <span className="text-brand font-mono font-bold shrink-0 w-5">{i + 1}.</span>
              <span className="leading-relaxed">{step}</span>
            </li>
          ))}
        </ol>
        {note && <p className="mt-3 text-fg-subtle text-xs">{note}</p>}
      </div>

      {/* Detection status */}
      <div
        className={`flex items-center gap-3 p-4 rounded-xl border mb-4 transition-all duration-300 ${
          detected
            ? "bg-success/[0.06] border-success/25"
            : "bg-bg-elevated border-border"
        }`}
      >
        {detected ? (
          <>
            <CheckCircle2 className="w-5 h-5 text-success shrink-0" />
            <div>
              <p className="text-small font-semibold text-fg">Widget detected</p>
              <p className="text-tiny text-fg-muted">Your assistant is live on your site.</p>
            </div>
          </>
        ) : (
          <>
            <Loader2 className="w-5 h-5 text-fg-subtle animate-spin shrink-0" />
            <div>
              <p className="text-small font-semibold text-fg">Waiting for widget</p>
              <p className="text-tiny text-fg-muted">Install the snippet and load your site. We&rsquo;ll detect it automatically.</p>
            </div>
          </>
        )}
      </div>

      {/* Concierge CTA */}
      <div className="flex items-center justify-between gap-4 p-4 rounded-xl border border-border bg-bg-elevated mb-8">
        <div className="flex items-center gap-3">
          <PhoneCall className="w-4 h-4 text-brand shrink-0" />
          <p className="text-fg-muted text-sm">
            Need help? We&rsquo;ll install it for you on a free 15-minute call.
          </p>
        </div>
        <a
          href="https://cal.com/liamclarke/install"
          target="_blank"
          rel="noopener noreferrer"
          className="text-brand text-sm font-semibold hover:underline shrink-0 cursor-pointer"
        >
          Book a call
        </a>
      </div>

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
        <Button
          type="button"
          onClick={() => onAdvance()}
          className="flex-1 justify-center"
        >
          {detected ? (
            <><CheckCircle2 className="w-4 h-4 mr-1.5" /> Widget live — Continue →</>
          ) : (
            "I've installed it — Continue →"
          )}
        </Button>
      </div>
    </div>
  );
}
