import Link from "next/link";

const footerLinks = [
  { label: "Features", href: "/#features" },
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

const productLinks = [
  { label: "Dashboard", href: "/#features" },
  { label: "Pricing", href: "/pricing" },
  { label: "How It Works", href: "/how-it-works" },
];

export default function Footer() {
  return (
    <footer className="bg-bg-dark border-t border-border-subtle text-white">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="md:col-span-1">
            <Link
              href="/"
              className="font-sans font-bold text-2xl cursor-pointer"
            >
              Qwikly
            </Link>
            <p className="text-text-tertiary mt-2 text-sm leading-relaxed">
              AI-powered lead response and lifecycle management for South
              African service businesses.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <h3 className="font-sans font-semibold text-sm uppercase tracking-wider mb-4 text-text-secondary">
              Navigation
            </h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-text-tertiary hover:text-white transition-colors duration-200 text-sm cursor-pointer"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Product */}
          <div>
            <h3 className="font-sans font-semibold text-sm uppercase tracking-wider mb-4 text-text-secondary">
              Product
            </h3>
            <ul className="space-y-2">
              {productLinks.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-text-tertiary hover:text-white transition-colors duration-200 text-sm cursor-pointer"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-sans font-semibold text-sm uppercase tracking-wider mb-4 text-text-secondary">
              Contact
            </h3>
            <a
              href="mailto:hello@qwikly.co.za"
              className="text-text-tertiary hover:text-white transition-colors duration-200 text-sm cursor-pointer"
            >
              hello@qwikly.co.za
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-border-subtle mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-text-tertiary">
          <span>Built by Clarke Agency</span>
          <span>&copy; {2026} Qwikly. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
