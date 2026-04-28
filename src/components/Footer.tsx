import Link from "next/link";

const productLinks = [
  { label: "Start trial", href: "/signup" },
  { label: "Sign in", href: "/login" },
  { label: "How it works", href: "/how-it-works" },
  { label: "Pricing", href: "/pricing" },
];

const companyLinks = [
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
  { label: "Status", href: "/status" },
];

const legalLinks = [
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Privacy Policy", href: "/legal/privacy" },
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

        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-16 border-b border-paper/10">
          <div className="md:col-span-4">
            <p className="eyebrow text-paper/50 mb-5">Contact</p>
            <a
              href="mailto:hello@qwikly.co.za"
              className="font-display text-2xl md:text-3xl text-paper hover:text-ember transition-colors cursor-pointer"
            >
              hello@qwikly.co.za
            </a>
            <p className="text-sm text-paper/50 mt-4 max-w-xs leading-relaxed">
              Talk to a human in Johannesburg. We&rsquo;ll have you live within
              24&ndash;48 hours.
            </p>
          </div>

          <div className="md:col-span-3 md:col-start-6">
            <p className="eyebrow text-paper/50 mb-5">Product</p>
            <ul className="space-y-3">
              {productLinks.map((link) => (
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

          <div className="md:col-span-2 md:col-start-9">
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

          <div className="md:col-span-2 md:col-start-11">
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

        {/* Meta Partner Disclosure */}
        <div className="mt-10 mb-8 py-6 border-b border-paper/10">
          <p className="text-xs text-paper/35 leading-relaxed max-w-2xl">
            Qwikly connects your business to the WhatsApp Business Platform via Meta&rsquo;s official
            Cloud API. Qwikly is not affiliated with, endorsed by, or a representative of Meta
            Platforms, Inc. WhatsApp is a trademark of Meta Platforms, Inc. All product names,
            logos, and brands are property of their respective owners.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-paper/40">
          <p className="eyebrow">POPIA compliant &middot; Customer data stays in South Africa</p>
          <p className="eyebrow">&copy; {new Date().getFullYear()} Qwikly (Clarke Agency). All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
