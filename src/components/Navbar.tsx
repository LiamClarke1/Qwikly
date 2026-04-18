"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import CTAButton from "@/components/CTAButton";

const navLinks = [
  { label: "How It Works", anchor: "#how-it-works" },
  { label: "Pricing", anchor: "#pricing" },
  { label: "FAQ", anchor: "#faq" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  function getHref(anchor: string) {
    return isHome ? anchor : `/${anchor}`;
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-white border-b border-border">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="font-heading font-bold text-xl text-primary">
            Qwikly
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={getHref(link.anchor)}
                className="text-foreground hover:text-cta transition-colors duration-200 text-sm font-medium"
              >
                {link.label}
              </a>
            ))}
            <CTAButton size="sm">Start Free Trial</CTAButton>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-primary"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-80" : "max-h-0"
        }`}
      >
        <div className="bg-white border-t border-border px-4 py-4 space-y-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={getHref(link.anchor)}
              onClick={() => setMobileOpen(false)}
              className="block text-foreground hover:text-cta transition-colors duration-200 text-base font-medium"
            >
              {link.label}
            </a>
          ))}
          <CTAButton size="sm" className="w-full justify-center">
            Start Free Trial
          </CTAButton>
        </div>
      </div>
    </nav>
  );
}
