import { PageHeader } from "@/components/ui/page";
import { IcpForm } from "@/components/pipeline-generator/IcpForm";

export const dynamic = "force-dynamic";

export default function GeneratePipelinePage() {
  return (
    <div>
      <PageHeader
        eyebrow="Qwikly Pipeline"
        title="Generate prospects"
        description="Define who you want to reach. Qwikly builds the list."
      />

      <DemoModeBanner />

      <IcpForm />
    </div>
  );
}

function DemoModeBanner() {
  return (
    <div
      className="mb-6 rounded-2xl border border-ember/30 bg-ember/10 px-5 py-4 flex items-start gap-3"
      role="note"
      aria-label="Demo mode notice"
    >
      <span className="mt-0.5 inline-flex h-6 items-center rounded-md bg-ember text-paper px-2 text-tiny font-semibold uppercase tracking-wide">
        Demo mode
      </span>
      <p className="text-small text-ink-700 leading-relaxed">
        Wiring in Apollo and Hunter for live scraping. For now, Qwikly returns realistic example prospects so you can see the flow.
      </p>
    </div>
  );
}
