import { Shield, MapPin } from "lucide-react";
import CTAButton from "@/components/CTAButton";

export default function PipelineHero() {
  return (
    <section className="relative pt-36 pb-20 md:pt-44 md:pb-28 grain overflow-hidden">
      <div className="ember-blob w-[700px] h-[460px] -top-20 -right-40 opacity-60" aria-hidden="true" />
      <div className="relative mx-auto max-w-site px-6 lg:px-10">
        <p className="eyebrow text-ember mb-6">Qwikly Pipeline</p>
        <h1 className="display-xl text-ink max-w-[20ch]">
          Booked sales calls on your calendar,{" "}
          <em className="italic font-light">every week.</em>
        </h1>
        <p className="mt-8 text-lg text-ink-700 max-w-2xl leading-relaxed">
          We find your ideal buyers, write a personal email to each one, and book qualified meetings on your calendar. Built for SA agencies, consultants, SaaS, and high-ticket service firms.
        </p>

        <div className="mt-10 flex flex-col sm:flex-row gap-4">
          <CTAButton href="/contact?subject=pipeline-strategy-call" variant="solid" size="lg">
            Book a strategy call
          </CTAButton>
          <CTAButton href="#system" variant="outline" size="lg" withArrow={false}>
            See the system
          </CTAButton>
        </div>

        {/* Trust strip */}
        <div className="mt-14 flex flex-wrap items-center gap-6 md:gap-10">
          <div className="flex items-center gap-2.5">
            <Shield className="w-5 h-5 text-ember" strokeWidth={1.5} aria-hidden="true" />
            <span className="eyebrow text-ink-600">POPIA compliant</span>
          </div>
          <span className="hidden md:block w-px h-5 bg-ink/10" aria-hidden="true" />
          <div className="flex items-center gap-2.5">
            <MapPin className="w-5 h-5 text-ember" strokeWidth={1.5} aria-hidden="true" />
            <span className="eyebrow text-ink-600">Hosted in South Africa</span>
          </div>
          <span className="hidden md:block w-px h-5 bg-ink/10" aria-hidden="true" />
          <div className="flex items-center gap-2.5">
            <svg viewBox="0 0 24 24" className="w-5 h-5 text-ember" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            <span className="eyebrow text-ink-600">ZAR pricing</span>
          </div>
        </div>
      </div>
    </section>
  );
}
