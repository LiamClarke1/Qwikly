import { PipelineForecastCalculator } from "./PipelineForecastCalculator";

export default function PipelineCalculatorSection() {
  return (
    <section className="py-28 grain overflow-hidden">
      <div className="mx-auto max-w-site px-6 lg:px-10">
        <div className="mb-14 max-w-2xl">
          <p className="eyebrow text-ember mb-6">Forecast</p>
          <h2 className="display-lg text-ink">
            What does this look like
            <br />
            <em className="italic font-light">for your business?</em>
          </h2>
          <p className="mt-6 text-lg text-ink-700 leading-relaxed max-w-xl">
            Run the maths. Adjust to match your reality. The defaults are industry baselines.
          </p>
        </div>

        <PipelineForecastCalculator />
      </div>
    </section>
  );
}
