import { User } from "lucide-react";

export default function Founder() {
  return (
    <section className="py-24 bg-bg-dark relative overflow-hidden">
      <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8">

        {/* Heading — two-line Hugo.ai style */}
        <div className="mb-14 reveal-up">
          <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.1]">
            Real teams, real results.
          </h2>
          <p className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight text-white/35 leading-[1.1] mt-1">
            See what happens when support gets easy.
          </p>
        </div>

        {/* Founder card — large portrait photo card */}
        <div className="max-w-sm mx-auto reveal-up">
          <div className="relative rounded-2xl overflow-hidden aspect-[3/4] bg-bg-elevated border border-border-subtle group cursor-default">

            {/* Photo placeholder */}
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-bg-elevated to-bg-card">
              <User className="w-24 h-24 text-text-tertiary" strokeWidth={1} />
            </div>

            {/* Qwikly badge — top left */}
            <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full px-3 py-1.5">
              <span className="text-accent font-black text-sm">Q</span>
              <span className="text-white text-xs font-semibold">Qwikly</span>
            </div>

            {/* Bottom gradient overlay + content */}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent pt-24 px-6 pb-6">
              {/* Quote placeholder */}
              <p className="text-white/80 text-sm leading-relaxed mb-4 italic">
                {/* Quote goes here */}
                &ldquo;Quote coming soon.&rdquo;
              </p>

              {/* Name + title */}
              <p className="text-white font-bold text-base">
                {/* Name goes here */}
                Name
              </p>
              <p className="text-white/50 text-sm mt-0.5">
                {/* Role goes here */}
                Founder, Qwikly
              </p>
            </div>
          </div>
        </div>

      </div>
    </section>
  );
}
