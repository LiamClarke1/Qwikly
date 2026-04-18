import Link from "next/link";

const footerLinks = [
  { label: "How It Works", href: "/#how-it-works" },
  { label: "Pricing", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export default function Footer() {
  return (
    <footer className="bg-primary text-white">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Brand */}
          <div>
            <Link href="/" className="font-heading font-bold text-2xl">
              Qwikly
            </Link>
            <p className="text-gray-400 mt-2 text-sm">
              Never miss a WhatsApp lead again.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wider mb-4">
              Links
            </h3>
            <ul className="space-y-2">
              {footerLinks.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-heading font-semibold text-sm uppercase tracking-wider mb-4">
              Contact
            </h3>
            <a
              href="mailto:hello@qwikly.co.za"
              className="text-gray-400 hover:text-white transition-colors duration-200 text-sm"
            >
              hello@qwikly.co.za
            </a>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-700 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
          <span>Built by Clarke Agency</span>
          <span>&copy; {2026} Qwikly. All rights reserved.</span>
        </div>
      </div>
    </footer>
  );
}
