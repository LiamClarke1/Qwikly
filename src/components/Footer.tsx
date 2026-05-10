import Link from "next/link";

const digitalAssistantLinks = [
  { label: "Digital Assistant", href: "/digital-assistant" },
  { label: "Pricing", href: "/pricing" },
  { label: "Watch the walkthrough", href: "/watch" },
  { label: "Compare", href: "/compare" },
];

const pipelineLinks = [
  { label: "Pipeline", href: "/pipeline" },
  { label: "How it works", href: "/how-it-works/lead-gen" },
  { label: "Case studies", href: "/case-studies" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Status", href: "/status" },
];

const legalLinks = [
  { label: "Trust", href: "/trust" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Delete my data", href: "/privacy/delete-my-data" },
];

export default function Footer() {
  return (
    <footer className="relative bg-ink text-paper overflow-hidden grain-dark">
      <div className="dot-grid absolute inset-0 opacity-40" />

      <div className="relative mx-auto max-w-site px-6 lg:px-10 pt-24 pb-10">
        {/* Giant wordmark */}
        <div className="mb-20">
          <p className="font-display text-[clamp(5rem,18vw,18rem)] leading-[0.85] tracking-[-0.04em] text-paper">
            Qwikly<span className="text-ember">.</span>
          </p>
          <p className="font-display italic text-xl md:text-2xl text-paper/60 mt-4 max-w-xl">
            Never miss a lead again. Built for South African service businesses.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-12 gap-10 pb-16 border-b border-paper/10">
          <div className="col-span-2 md:col-span-3">
            <p className="eyebrow text-paper/50 mb-5">Contact</p>
            {/* TODO: Set up forwarding rule on the qwikly.co.za domain MX so hello@qwikly.co.za delivers to the team inbox. */}
            <a
              href="mailto:hello@qwikly.co.za"
              className="font-display text-2xl md:text-3xl text-paper hover:text-ember transition-colors cursor-pointer"
            >
              hello@qwikly.co.za
            </a>
            <p className="text-sm text-paper/50 mt-4 max-w-xs leading-relaxed">
              Talk to a human in Cape Town. We&rsquo;ll have you live within
              24 to 48 hours.
            </p>
          </div>

          <div className="md:col-span-3 md:col-start-5">
            <p className="eyebrow text-paper/50 mb-5">Digital Assistant</p>
            <ul className="space-y-3">
              {digitalAssistantLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-paper/80 hover:text-paper transition-colors duration-200 text-base cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 md:col-start-8">
            <p className="eyebrow text-paper/50 mb-5">Pipeline</p>
            <ul className="space-y-3">
              {pipelineLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-paper/80 hover:text-paper transition-colors duration-200 text-base cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 md:col-start-10">
            <p className="eyebrow text-paper/50 mb-5">Company</p>
            <ul className="space-y-3">
              {companyLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-paper/80 hover:text-paper transition-colors duration-200 text-base cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="md:col-span-2 md:col-start-12">
            <p className="eyebrow text-paper/50 mb-5">Legal</p>
            <ul className="space-y-3">
              {legalLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-paper/80 hover:text-paper transition-colors duration-200 text-base cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-paper/40">
          <p className="eyebrow">POPIA compliant &middot; Customer data stays in South Africa</p>
          <p className="eyebrow">&copy; {new Date().getFullYear()} Qwikly (Clarke Agency). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
