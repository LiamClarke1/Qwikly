"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { IntakeScreen, type IntakeValues } from "./IntakeScreen";
import { EnrichmentLoadingScreen } from "./EnrichmentLoadingScreen";
import { ReviewIcpScreen } from "./ReviewIcpScreen";
import type { EnrichedIcp } from "@/lib/pipeline/enrichment/types";
import type { IcpDefinition } from "@/lib/pipeline/setup-state";

type Step = "intake" | "loading" | "review" | "generating" | "error";

export function Wizard() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("intake");
  const [enriched, setEnriched] = useState<EnrichedIcp | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleIntake(v: IntakeValues) {
    setStep("loading");
    try {
      const res = await fetch("/api/pipeline/icp/enrich", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(v),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setErrorMsg(body.message || `Enrichment failed (${res.status})`);
        setStep("error");
        return;
      }
      const enrichedBody = (await res.json()) as EnrichedIcp;
      setEnriched(enrichedBody);
      setStep("review");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Network error");
      setStep("error");
    }
  }

  async function handleSave(icp: IcpDefinition) {
    setStep("generating");
    try {
      const saveRes = await fetch("/api/pipeline/setup/save-and-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icp, firstBatch: true, count: 5 }),
      });
      if (!saveRes.ok) {
        const body = await saveRes.json().catch(() => ({}));
        setErrorMsg(body.message || `Save failed (${saveRes.status})`);
        setStep("error");
        return;
      }
      router.push("/dashboard/pipeline?firstBatch=1");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Network error");
      setStep("error");
    }
  }

  if (step === "intake") return <IntakeScreen onSubmit={handleIntake} />;
  if (step === "loading" || step === "generating") return <EnrichmentLoadingScreen />;
  if (step === "review" && enriched) {
    return <ReviewIcpScreen enriched={enriched} onSave={handleSave} />;
  }
  if (step === "error") {
    return (
      <div className="max-w-xl mx-auto p-12 text-center space-y-4">
        <h2 className="font-display text-2xl text-ink-900">Something went wrong</h2>
        <p className="text-ink-600">{errorMsg}</p>
        <button
          type="button"
          onClick={() => {
            setErrorMsg(null);
            setStep("intake");
          }}
          className="rounded-md bg-ember px-4 py-2 text-white cursor-pointer hover:bg-ember/90"
        >
          Try again
        </button>
      </div>
    );
  }
  return null;
}
