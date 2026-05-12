import Link from "next/link";
import CTAButton from "@/components/CTAButton";

interface Prospect {
  initials: string;
  name: string;
  role: string;
  company: string;
  email: string;
}

const prospects: Prospect[] = [
  {
    initials: "LM",
    name: "Lerato Mokoena",
    role: "Practice Manager",
    company: "Greenpoint Dental",
    email: "lerato@greenpointdental.co.za",
  },
  {
    initials: "JV",
    name: "James van Wyk",
    role: "Operations Director",
    company: "Cape Plumbing Co.",
    email: "james@capeplumbing.co.za",
  },
  {
    initials: "NN",
    name: "Nomvula Ndlovu",
    role: "Founder",
    company: "Sandton Skin Studio",
    email: "nomvula@sandtonskin.co.za",
  },
  {
    initials: "TB",
    name: "Thabo Botha",
    role: "Owner",
    company: "Pretoria Auto Works",
    email: "thabo@pretoriaautoworks.co.za",
  },
  {
    initials: "AS",
    name: "Anika Steyn",
    role: "Marketing Lead",
    company: "Hout Bay Wellness",
    email: "anika@houtbaywellness.co.za",
  },
];

function VerifiedCheck() {
  return (
    <svg
      viewBox="0 0 16 16"
      className="w-3 h-3 text-ember"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.25"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

export default function PipelineHero() {
  return (
    <section className="relative pt-36 md:pt-44 pb-16 grain overflow-hidden">
      <div className="ember-blob w-[680px] h-[440px] -top-24 -right-32 opacity-55" aria-hidden="true" />
      <div className="relative mx-auto max-w-site px-6 lg:px-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center">

          {/* LEFT: copy + CTAs */}
          <div className="lg:col-span-5">
            <p className="eyebrow text-ember mb-6">Qwikly Outbound</p>
            <h1 className="display-xl text-ink leading-[1.02]">
              Your next client,{" "}
              <em className="italic font-light">delivered daily.</em>
            </h1>
            <p className="mt-7 text-lg text-ink-700 leading-relaxed max-w-md">
              A hand-picked, verified prospect feed in your dashboard every business day. You decide who to reach out to.
            </p>

            <div className="mt-9 flex flex-col sm:flex-row gap-4">
              <CTAButton href="/contact?subject=pipeline-strategy-call" variant="solid" size="lg">
                Book a strategy call
              </CTAButton>
              <Link
                href="/pricing"
                className="inline-flex items-center self-start sm:self-center text-ink font-medium underline-ember"
              >
                See pricing
              </Link>
            </div>
          </div>

          {/* RIGHT: faux prospect feed */}
          <div className="lg:col-span-7">
            <div
              className="relative rounded-2xl bg-white shadow-pop border border-ink/[0.06] overflow-hidden will-change-transform"
              style={{ transform: "translateZ(0)" }}
              aria-hidden="true"
            >
              {/* top bar */}
              <div className="flex items-center justify-between px-5 md:px-6 py-3.5 border-b border-ink/10 bg-paper-deep/40">
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-ember" />
                    <span className="w-2 h-2 rounded-full bg-ink/15" />
                    <span className="w-2 h-2 rounded-full bg-ink/15" />
                  </span>
                  <span className="ml-3 font-mono text-[0.72rem] tracking-wide text-ink-700 uppercase">
                    Outbound · Today
                  </span>
                </div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-ember/10 text-ember font-mono text-[0.7rem] tracking-wide">
                  <span className="w-1.5 h-1.5 rounded-full bg-ember" />
                  5 of 5 delivered
                </span>
              </div>

              {/* rows */}
              <ul className="divide-y divide-ink/10">
                {prospects.map((p, i) => (
                  <li
                    key={p.email}
                    className={`flex items-center gap-3 md:gap-4 px-5 md:px-6 py-4 ${
                      i === 0 ? "border-t border-ink/0" : ""
                    }`}
                  >
                    {/* avatar */}
                    <div className="flex-shrink-0 w-9 h-9 md:w-10 md:h-10 rounded-full bg-paper-deep flex items-center justify-center font-mono text-[0.72rem] text-ember tracking-wide">
                      {p.initials}
                    </div>

                    {/* identity */}
                    <div className="min-w-0 flex-1">
                      <p className="font-display text-base md:text-lg text-ink leading-tight truncate">
                        {p.name}
                      </p>
                      <p className="text-xs md:text-sm text-ink-500 leading-tight mt-0.5 truncate">
                        {p.role} · {p.company}
                      </p>
                    </div>

                    {/* verified pill */}
                    <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-ember/25 bg-ember/[0.06] font-mono text-[0.68rem] text-ember tracking-wide">
                      <VerifiedCheck />
                      verified
                    </span>

                    {/* view */}
                    <span className="font-mono text-[0.7rem] text-ink-500 tracking-wide hover:text-ember">
                      View
                    </span>
                  </li>
                ))}
              </ul>

              {/* footer hairline */}
              <div className="px-5 md:px-6 py-3 border-t border-ink/10 bg-paper-deep/30 flex items-center justify-between">
                <span className="font-mono text-[0.68rem] text-ink-500 tracking-wide uppercase">
                  Next batch, tomorrow 08:00
                </span>
                <span className="font-mono text-[0.68rem] text-ink-500 tracking-wide">
                  ICP, Dental · Cape Town
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
