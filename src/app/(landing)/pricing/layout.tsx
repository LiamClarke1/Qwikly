import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Qwikly offers three flat monthly plans starting at R399/month. No per-job fees, no commissions, no setup costs. 30-day money-back guarantee.",
  alternates: { canonical: "https://www.qwikly.co.za/pricing" },
  openGraph: {
    title: "Qwikly Pricing — Flat Monthly Plans. No Per-Job Fees.",
    description:
      "Lite R399/mo · Pro R799/mo · Business R1,499/mo. No commissions, no setup fees, no lock-in. 30-day money-back guarantee.",
    url: "https://www.qwikly.co.za/pricing",
  },
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Qwikly Digital Assistant",
  description:
    "Automated WhatsApp lead response and booking system for South African tradespeople. Replies in 30 seconds, qualifies leads, and books appointments 24/7.",
  brand: { "@type": "Brand", name: "Qwikly" },
  offers: [
    {
      "@type": "Offer",
      name: "Lite",
      priceCurrency: "ZAR",
      price: "399",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      description: "Up to 25 confirmed bookings per month. WhatsApp replies in 30 seconds, auto job qualification, calendar booking and reminders.",
      availability: "https://schema.org/InStock",
      url: "https://www.qwikly.co.za/pricing",
    },
    {
      "@type": "Offer",
      name: "Pro",
      priceCurrency: "ZAR",
      price: "799",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      description: "Unlimited confirmed bookings. Everything in Lite plus no-show recovery, web widget, Google and Outlook calendar sync, and priority support.",
      availability: "https://schema.org/InStock",
      url: "https://www.qwikly.co.za/pricing",
    },
    {
      "@type": "Offer",
      name: "Business",
      priceCurrency: "ZAR",
      price: "1499",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      description: "Everything in Pro plus multi-user teams, custom branding, quote and invoice handoff, dedicated success manager, and API access.",
      availability: "https://schema.org/InStock",
      url: "https://www.qwikly.co.za/pricing",
    },
  ],
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "Do I pay per booking?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Qwikly charges a flat monthly rate only. You pay the same amount whether you book 1 job or 100. No commissions, no per-job fees. Ever.",
      },
    },
    {
      "@type": "Question",
      name: "What happens if I exceed 25 bookings on Lite?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "We'll let you know when you're approaching your limit and prompt you to upgrade to Pro. You won't be charged extra or cut off mid-month, and there are no surprise fees.",
      },
    },
    {
      "@type": "Question",
      name: "Can I cancel anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. No contracts, no lock-in. Cancel from your dashboard at any time. Monthly plans end at the close of your current billing period.",
      },
    },
    {
      "@type": "Question",
      name: "Do you take a cut of my jobs?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Never. Qwikly earns nothing from your bookings. Every rand you earn stays yours.",
      },
    },
    {
      "@type": "Question",
      name: "Is my data safe?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. Qwikly is fully POPIA-compliant and your data is hosted in South Africa. We never sell your data or your customers' data to third parties.",
      },
    },
  ],
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      {children}
    </>
  );
}
