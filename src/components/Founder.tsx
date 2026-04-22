import { User } from "lucide-react";

export default function Founder() {
  return (
    <section className="py-24 bg-bg-dark relative overflow-hidden noise-overlay">
      {/* Background orbs */}
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute w-[600px] h-[400px] top-0 right-0 rounded-full bg-blue-600/8 blur-[120px]" />
        <div className="absolute w-[400px] h-[400px] bottom-0 left-0 rounded-full bg-violet-600/6 blur-[100px]" />
        <div className="absolute inset-0 grid-bg opacity-20" />
      </div>

      <div className="relative z-10 mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        {/* Section label */}
        <div className="text-center mb-14 reveal-up">
          <div className="w-16 gold-line mx-auto mb-6" />
          <p className="text-text-tertiary text-sm font-semibold uppercase tracking-widest mb-4">Founder</p>
          <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight max-w-2xl mx-auto">
            Real teams, real results. See what happens when support gets easy.
          </h2>
        </div>

        {/* Founder card */}
        <div className="max-w-3xl mx-auto reveal-up">
          <div className="glass-card-dark p-8 md:p-10 flex flex-col md:flex-row gap-8 md:gap-12 items-start">

            {/* Photo + identity */}
            <div className="flex flex-col items-center md:items-start gap-4 flex-shrink-0">
              {/* Photo placeholder */}
              <div className="w-32 h-32 md:w-40 md:h-40 rounded-2xl bg-bg-elevated border border-border-subtle flex items-center justify-center overflow-hidden">
                <User className="w-14 h-14 md:w-16 md:h-16 text-text-tertiary" strokeWidth={1.5} />
              </div>

              {/* Name + role */}
              <div className="text-center md:text-left">
                <p className="font-bold text-white text-lg">
                  {/* Name goes here */}
                  <span className="text-text-tertiary italic">Name</span>
                </p>
                <p className="text-text-tertiary text-sm mt-0.5">
                  {/* Role goes here */}
                  <span className="italic">Founder, Qwikly</span>
                </p>
              </div>
            </div>

            {/* Bio */}
            <div className="flex-1 flex flex-col gap-5">
              {/* Opening quote mark */}
              <svg className="w-8 h-8 text-accent/40 flex-shrink-0" fill="currentColor" viewBox="0 0 32 32" aria-hidden="true">
                <path d="M9.352 4C4.456 7.456 1 13.12 1 19.36c0 5.088 3.072 8.064 6.624 8.064 3.36 0 5.856-2.688 5.856-5.856 0-3.168-2.208-5.472-5.088-5.472-.576 0-1.344.096-1.536.192.48-3.264 3.552-7.104 6.624-9.024L9.352 4zm16.512 0c-4.8 3.456-8.256 9.12-8.256 15.36 0 5.088 3.072 8.064 6.624 8.064 3.264 0 5.856-2.688 5.856-5.856 0-3.168-2.304-5.472-5.184-5.472-.576 0-1.248.096-1.44.192.48-3.264 3.456-7.104 6.528-9.024L25.864 4z" />
              </svg>

              {/* Bio placeholder */}
              <p className="text-text-secondary leading-relaxed text-base md:text-lg">
                {/* Bio paragraph goes here */}
                <span className="text-text-tertiary italic">Bio coming soon.</span>
              </p>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
