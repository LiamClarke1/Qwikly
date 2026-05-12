"use client";

export const dynamic = "force-dynamic";

import { Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Zap, Check, ArrowRight } from "lucide-react";

function SignupContent() {
  const router = useRouter();

  useEffect(() => {
    // Hard redirect: self-service signup is no longer available.
    // Visitors must book a call to get set up.
    router.replace("/contact");
  }, [router]);

  // Shown briefly while redirect happens
  return (
    <main className="min-h-screen [min-height:100dvh] flex bg-paper">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-[40%] shrink-0 flex-col justify-between p-12 bg-paper-deep border-r border-ink/[0.08] relative overflow-hidden">
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-ember/[0.06] blur-3xl pointer-events-none" />
        <div>
          <a href="/" className="inline-flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-grad-brand flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" strokeWidth={2.5} />
            </div>
            <span className="font-heading text-base text-ink font-semibold tracking-tight">Qwikly</span>
          </a>
        </div>
        <div className="space-y-8 relative">
          <div>
            <p className="eyebrow text-ink-500 mb-4">The digital front desk for your business</p>
            <h1 className="font-display text-[2.6rem] text-ink leading-[1.05] tracking-[-0.03em]">
              Captures every lead.
              <br />
              Qualifies them.
              <br />
              <em className="text-ember italic font-light">Books them in.</em>
            </h1>
          </div>
          <div className="space-y-3">
            {[
              "We set everything up for you — live in 24–48 hours",
              "Flat monthly plan, no card needed online",
              "Digital assistant on your website 24/7",
              "Leads delivered to your inbox instantly",
              "Cancel anytime, no lock-in contracts",
            ].map((point, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-ember/10 border border-ember/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-ember" />
                </div>
                <span className="text-ink-500 text-small">{point}</span>
              </div>
            ))}
          </div>
        </div>
        <p className="eyebrow text-ink-400 relative">POPIA compliant · Data stays in South Africa</p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md text-center space-y-6">
          {/* Mobile logo */}
          <div className="lg:hidden mb-6 flex justify-center">
            <a href="/" className="inline-flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-grad-brand flex items-center justify-center">
                <Zap className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
              </div>
              <span className="font-heading text-base text-ink font-semibold tracking-tight">Qwikly</span>
            </a>
          </div>

          <div className="w-14 h-14 bg-ember/10 border border-ember/20 rounded-full flex items-center justify-center mx-auto">
            <Zap className="w-6 h-6 text-ember" strokeWidth={2.5} />
          </div>
          <div>
            <h2 className="text-h1 text-ink">Get started with Qwikly</h2>
            <p className="text-ink-500 text-small mt-3 leading-relaxed">
              We set your digital assistant up for you — book a quick call and we&rsquo;ll have you live within 24–48 hours.
            </p>
          </div>
          <Link
            href="/contact"
            className="inline-flex w-full items-center justify-center gap-2 h-12 bg-grad-brand text-white text-small font-semibold rounded-xl cursor-pointer hover:brightness-110 transition-all duration-150 shadow-[0_8px_24px_-8px_rgba(232,90,44,0.4)]"
          >
            Book a setup call
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="text-tiny text-ink-400">
            Already have an account?{" "}
            <Link href="/login" className="text-ember hover:text-ember-deep font-medium transition-colors duration-200">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupContent />
    </Suspense>
  );
}
