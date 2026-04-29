"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useClient } from "@/lib/use-client";
import { supabase } from "@/lib/supabase";
import { WizardShell } from "./_components/WizardShell";
import StepBusiness from "./_components/StepBusiness";
import StepWebsite from "./_components/StepWebsite";
import StepCustomise from "./_components/StepCustomise";
import StepCalendar from "./_components/StepCalendar";
import StepHours from "./_components/StepHours";
import StepInstall from "./_components/StepInstall";
import StepVerify from "./_components/StepVerify";
import StepTest from "./_components/StepTest";

const STEPS = [
  { id: 1, title: "About your business",     Component: StepBusiness  },
  { id: 2, title: "Your website",            Component: StepWebsite   },
  { id: 3, title: "Customise the assistant", Component: StepCustomise },
  { id: 4, title: "Connect your calendar",   Component: StepCalendar  },
  { id: 5, title: "Working hours",           Component: StepHours     },
  { id: 6, title: "Install the widget",      Component: StepInstall   },
  { id: 7, title: "Verify install",          Component: StepVerify    },
  { id: 8, title: "Test conversation",       Component: StepTest      },
];

export default function OnboardingWebsite() {
  const router = useRouter();
  const { client, refresh } = useClient();
  const [currentStep, setCurrentStep] = useState(1);

  useEffect(() => {
    if (!client) return;
    if (client.onboarding_completed_at) {
      router.push("/dashboard?welcome=true");
      return;
    }
    if (client.onboarding_step && client.onboarding_step > 1) {
      setCurrentStep(client.onboarding_step);
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

  return (
    <WizardShell
      currentStep={currentStep}
      totalSteps={STEPS.length}
      title={step.title}
      onSaveLater={saveLater}
    >
      <Component client={client} onAdvance={advance} onBack={back} refresh={refresh} />
    </WizardShell>
  );
}
