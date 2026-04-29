"use client";

import { useState } from "react";
import { ClientRow } from "@/lib/use-client";
import { Loader2, CheckCircle2, XCircle, PhoneCall, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  client: ClientRow;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

interface VerifyResult {
  verified: boolean;
  reason?: string;
  diagnostics?: string[];
}

const DIAGNOSTIC_LABELS: Record<string, string> = {
  widget_script_not_found: "The widget script wasn't found on your page — did you save and publish your site?",
  wrong_client_id: "A Qwikly widget was found but with a different client ID. Copy the snippet exactly.",
  script_tag_malformed: "The script tag looks malformed. Try copying and pasting fresh from the previous step.",
  site_unreachable: "We couldn't reach your site. Is it published and publicly accessible?",
  network_error: "Network error — check your connection and try again.",
};

export default function StepVerify({ client, onAdvance, onBack, refresh }: Props) {
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<VerifyResult | null>(
    client.web_widget_status === "verified" ? { verified: true } : null
  );
  const [attempts, setAttempts] = useState(0);

  async function checkInstall() {
    setChecking(true);
    setAttempts((a) => a + 1);
    try {
      const res = await fetch("/api/onboarding/verify-install", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: client.id }),
      });
      const data: VerifyResult = await res.json();
      setResult(data);
      if (data.verified) await refresh();
    } catch {
      setResult({ verified: false, reason: "network_error" });
    }
    setChecking(false);
  }

  return (
    <div className="pt-10 max-w-lg">
      <h1 className="text-display-1 font-semibold text-fg mb-2">
        Let&rsquo;s check it&rsquo;s installed.
      </h1>
      <p className="text-fg-muted text-body mb-6">
        Make sure you&rsquo;ve saved and published your site changes, then click the button below.
      </p>

      {/* Success state */}
      {result?.verified && (
        <div className="flex items-start gap-3 p-5 rounded-xl border border-success/30 bg-success/5 mb-6">
          <CheckCircle2 className="w-6 h-6 text-success mt-0.5 shrink-0" />
          <div>
            <p className="text-fg font-semibold">Widget found and verified!</p>
            <p className="text-fg-muted text-sm mt-0.5">
              Your assistant is live on {client.web_widget_domain}.
            </p>
          </div>
        </div>
      )}

      {/* Failure state */}
      {result && !result.verified && (
        <div className="p-5 rounded-xl border border-danger/30 bg-danger/5 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <XCircle className="w-5 h-5 text-danger mt-0.5 shrink-0" />
            <p className="text-fg font-semibold text-sm">Widget not found yet.</p>
          </div>
          <ul className="space-y-2 ml-8">
            {(result.diagnostics ?? [result.reason]).filter(Boolean).map((d) => (
              <li key={d} className="text-fg-muted text-sm flex items-start gap-2">
                <span className="text-danger shrink-0">•</span>
                {DIAGNOSTIC_LABELS[d!] ?? d}
              </li>
            ))}
            {!result.diagnostics?.length && !result.reason && (
              <>
                <li className="text-fg-muted text-sm">• Did you save and publish your site?</li>
                <li className="text-fg-muted text-sm">• Is the script in the correct location (body end)?</li>
                <li className="text-fg-muted text-sm">• Did you copy the full snippet including data-client?</li>
              </>
            )}
          </ul>

          {attempts >= 3 && (
            <div className="mt-4 pt-4 border-t border-danger/20 flex items-center gap-3">
              <PhoneCall className="w-4 h-4 text-brand shrink-0" />
              <a
                href="https://cal.com/liamclarke/install"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brand text-sm font-semibold hover:underline cursor-pointer"
              >
                Stuck? Book a free 15-min install call →
              </a>
            </div>
          )}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="button" variant="outline" onClick={onBack}>← Back</Button>

        {result?.verified ? (
          <Button type="button" onClick={() => onAdvance()} className="flex-1 justify-center">
            Continue →
          </Button>
        ) : (
          <Button
            type="button"
            onClick={checkInstall}
            disabled={checking}
            className="flex-1 justify-center"
          >
            {checking ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" />Checking your site…</>
            ) : (
              <><RotateCcw className="w-4 h-4 mr-2" />Check my site</>
            )}
          </Button>
        )}
      </div>

      {!result?.verified && (
        <p className="text-fg-subtle text-xs text-center mt-4">
          We fetch your site live and look for the widget code. Takes about 5 seconds.
        </p>
      )}
    </div>
  );
}
