"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import CTAButton from "@/components/CTAButton";

type NavLink =
  | { label: string; anchor: string; href?: never }
  | { label: string; href: string; anchor?: never };

const navLinks: NavLink[] = [
  { label: "Outcomes", anchor: "#outcomes" },
  { label: "How it works", anchor: "#how-it-works" },
  { label: "For your website", href: "/connect-your-website" },
  { label: "Pricing", href: "/pricing" },
  { label: "FAQ", anchor: "#faq" },
];

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isHome = pathname === "/";

  useEffect(() => {
    function handleScroll() {
      setScrolled(window.scrollY > 10);
    }
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  function getHref(anchor: string) {
    return isHome ? anchor : `/${anchor}`;
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? "bg-paper/80 backdrop-blur-xl border-b border-ink/[0.06]"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-site px-6 lg:px-10">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link
            href="/"
            className="font-display text-[1.6rem] tracking-tight text-ink cursor-pointer leading-none"
            aria-label="Qwikly home"
          >
            Qwikly<span className="text-ember">.</span>
          </Link>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-10">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={"href" in link && link.href ? link.href : getHref(link.anchor ?? "")}
                className="text-ink-700 hover:text-ink transition-colors duration-200 text-[0.9rem] cursor-pointer"
              >
                {link.label}
              </a>
            ))}
            <a
              href="/login"
              className="text-ink-700 hover:text-ink transition-colors duration-200 text-[0.9rem] cursor-pointer"
            >
              Sign in
            </a>
            <CTAButton size="sm" href="/signup">
              Start trial
            </CTAButton>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 text-ink cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
          >
            {mobileOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${
          mobileOpen ? "max-h-96" : "max-h-0"
        }`}
      >
        <div className="bg-paper/95 backdrop-blur-xl border-t border-ink/10 px-6 py-6 space-y-4">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={"href" in link && link.href ? link.href : getHref(link.anchor ?? "")}
              onClick={() => setMobileOpen(false)}
              className="block text-ink-700 hover:text-ink transition-colors duration-200 text-base font-medium cursor-pointer"
            >
              {link.label}
            </a>
          ))}
          <a
            href="/login"
            className="block text-ink-700 hover:text-ink transition-colors duration-200 text-base font-medium cursor-pointer"
            onClick={() => setMobileOpen(false)}
          >
            Sign in
          </a>
          <CTAButton size="sm" href="/signup" className="w-full justify-center">
            Start trial
          </CTAButton>
        </div>
      </div>
    </nav>
  );
}
