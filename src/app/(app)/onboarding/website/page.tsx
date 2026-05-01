"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useClient } from "@/lib/use-client";
import { supabase } from "@/lib/supabase";
import { type PlanTier } from "@/lib/plan";
import { WizardShell } from "./_components/WizardShell";
import StepBusiness from "./_components/StepBusiness";
import StepAssistant from "./_components/StepAssistant";
import StepInstall from "./_components/StepInstall";
import StepBilling from "./_components/StepBilling";
import StepWelcome from "./_components/StepWelcome";

const STEPS = [
  { id: 1, title: "Your business",          Component: StepBusiness   },
  { id: 2, title: "Configure your assistant", Component: StepAssistant },
  { id: 3, title: "Install your widget",    Component: StepInstall    },
  { id: 4, title: "Billing",                Component: StepBilling    },
  { id: 5, title: "All done!",              Component: StepWelcome    },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { client, refresh } = useClient();
  const [currentStep, setCurrentStep] = useState(1);

  const planParam = searchParams.get("plan");
  const validPlans: PlanTier[] = ["starter", "pro", "premium"];
  const plan: PlanTier = validPlans.includes(planParam as PlanTier)
    ? (planParam as PlanTier)
    : "starter";

  useEffect(() => {
    if (!client) return;
    if (client.onboarding_completed_at) {
      router.push("/dashboard?welcome=true");
      return;
    }
    if (client.onboarding_step && client.onboarding_step > 1) {
      setCurrentStep(Math.min(client.onboarding_step, STEPS.length));
    }
  }, [client, router]);

  const advance = useCallback(async () => {
    if (!client) return;
    const next = currentStep + 1;
    if (next > STEPS.length) {
      await supabase
        .from("clients")
        .update({ onboarding_completed_at: new Date().toISOString() })
        .eq("id", client.id);
      router.push("/dashboard?welcome=true");
    } else {
      await supabase
        .from("clients")
        .update({ onboarding_step: next })
        .eq("id", client.id);
      setCurrentStep(next);
      await refresh();
    }
  }, [currentStep, client, router, refresh]);

  const back = useCallback(() => {
    setCurrentStep((s) => Math.max(1, s - 1));
  }, []);

  const saveLater = useCallback(async () => {
    if (!client) return;
    await supabase
      .from("clients")
      .update({ onboarding_step: currentStep })
      .eq("id", client.id);
    router.push("/dashboard");
  }, [currentStep, client, router]);

  const step = STEPS.find((s) => s.id === currentStep);
  if (!step || !client) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand/30 border-t-brand rounded-full animate-spin" />
      </div>
    );
  }

  const { Component } = step;
  const hideSaveLater = currentStep >= STEPS.length;

  return (
    <WizardShell
      currentStep={currentStep}
      totalSteps={STEPS.length}
      title={step.title}
      onSaveLater={hideSaveLater ? undefined : saveLater}
    >
      <Component client={client} plan={plan} onAdvance={advance} onBack={back} refresh={refresh} />
    </WizardShell>
  );
}

export default function OnboardingWebsite() {
  return (
    <Suspense>
      <OnboardingContent />
    </Suspense>
  );
}
