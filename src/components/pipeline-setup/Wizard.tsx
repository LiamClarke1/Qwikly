"use client";

import { useState, useTransition } from "react";
import Stepper from "./Stepper";
import IcpStep from "./IcpStep";
import SeedListStep from "./SeedListStep";
import DomainsStep from "./DomainsStep";
import CopyStep, { type CopyTemplatePreview } from "./CopyStep";
import LaunchStep from "./LaunchStep";
import { setStep as setStepAction } from "@/app/(app)/dashboard/pipeline/setup/actions";
import type { PipelineSetupState } from "@/lib/pipeline/setup-state";

interface Props {
  initialState: PipelineSetupState;
  copyTemplates: CopyTemplatePreview[];
}

export default function Wizard({ initialState, copyTemplates }: Props) {
  const [state, setState] = useState<PipelineSetupState>(initialState);
  const [, startTransition] = useTransition();

  function handleAdvance(next: PipelineSetupState) {
    setState(next);
  }

  function jumpToStep(step: 1 | 2 | 3 | 4 | 5) {
    if (step >= state.current_step) return;
    setState((prev) => ({ ...prev, current_step: step }));
    startTransition(async () => {
      await setStepAction(step);
    });
  }

  return (
    <div className="space-y-6">
      <Stepper currentStep={state.current_step} onJump={jumpToStep} />

      {state.current_step === 1 && (
        <IcpStep initialIcp={state.icp} onAdvance={handleAdvance} />
      )}
      {state.current_step === 2 && (
        <SeedListStep initialSeedList={state.seed_list} onAdvance={handleAdvance} />
      )}
      {state.current_step === 3 && (
        <DomainsStep initialDomains={state.domains} onAdvance={handleAdvance} />
      )}
      {state.current_step === 4 && (
        <CopyStep
          initialCopy={state.copy}
          templates={copyTemplates}
          onAdvance={handleAdvance}
        />
      )}
      {state.current_step === 5 && (
        <LaunchStep state={state} onAdvance={handleAdvance} />
      )}
    </div>
  );
}
