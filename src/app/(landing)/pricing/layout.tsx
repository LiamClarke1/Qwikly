import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Qwikly offers four flat monthly plans: Starter R699, Pro R1,799, Business R3,999, Enterprise from R7,999. 7-day free trial on every plan. No per-job fees, no commissions. Cancel anytime.",
  alternates: { canonical: "https://www.qwikly.co.za/pricing" },
  openGraph: {
    title: "Qwikly Pricing: Flat Monthly Plans. No Per-Job Fees.",
    description:
      "Starter R699 · Pro R1,799 · Business R3,999 · Enterprise R7,999+. 7-day free trial. No commissions, no setup fees, no lock-in.",
    url: "https://www.qwikly.co.za/pricing",
  },
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Qwikly Digital Assistant Platform",
  description:
    "Digital assistant platform for South African businesses. Captures leads, qualifies them, and delivers booking requests to your inbox 24/7.",
  brand: { "@type": "Brand", name: "Qwikly" },
  offers: [
    {
      "@type": "Offer",
      name: "Free Trial",
      priceCurrency: "ZAR",
      price: "0",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P7D" },
      description: "7-day free trial of the Qwikly digital assistant platform. No card required.",
      availability: "https://schema.org/InStock",
      url: "https://www.qwikly.co.za/pricing",
    },
    {
      "@type": "Offer",
      name: "Starter",
      priceCurrency: "ZAR",
      price: "699",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      description: "30 qualified leads per month. Digital assistant platform, email lead delivery, POPIA compliant.",
      availability: "https://schema.org/InStock",
      url: "https://www.qwikly.co.za/pricing",
    },
    {
      "@type": "Offer",
      name: "Pro",
      priceCurrency: "ZAR",
      price: "1799",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      description: "100 qualified leads per month. Custom branding (your logo, no Qwikly footer), custom greeting and qualifying questions, 3 dashboard users.",
      availability: "https://schema.org/InStock",
      url: "https://www.qwikly.co.za/pricing",
    },
    {
      "@type": "Offer",
      name: "Business",
      priceCurrency: "ZAR",
      price: "3999",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      description: "400 qualified leads per month. Unlimited users, CSV exports, priority 4-hour support, custom branding.",
      availability: "https://schema.org/InStock",
      url: "https://www.qwikly.co.za/pricing",
    },
    {
      "@type": "Offer",
      name: "Enterprise",
      priceCurrency: "ZAR",
      price: "7999",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      description: "1,500+ qualified leads per month. Full white-label, API access, dedicated 1-hour SLA support. Custom volume pricing on request.",
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
      name: "What counts as a qualified lead?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "A qualified lead is a visitor who has provided their contact details and answered your qualifying questions: service type, location, and buying intent. Bounced chats and spam are not counted.",
      },
    },
    {
      "@type": "Question",
      name: "Do I pay per lead or per booking?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. Qwikly charges a flat monthly rate only. No commissions, no per-job fees. If you exceed your monthly lead cap, top-ups are billed at your plan's per-lead rate (R23 on Starter, R20 on Pro, R12 on Business, custom on Enterprise), close to what you're already paying inside the plan, never a flat overage.",
      },
    },
    {
      "@type": "Question",
      name: "Can I switch plans anytime?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes. No contracts, no lock-in. Cancel or change plans from your dashboard at any time.",
      },
    },
    {
      "@type": "Question",
      name: "Do you take a cut of my jobs?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Never. Qwikly earns nothing from your bookings. Every rand you earn stays yours. That's the whole point of flat pricing.",
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
