import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Qwikly offers three flat monthly plans: Starter (free), Pro at R599/month, Premium at R1,299/month. No per-job fees, no commissions. 30-day money-back guarantee.",
  alternates: { canonical: "https://www.qwikly.co.za/pricing" },
  openGraph: {
    title: "Qwikly Pricing: Flat Monthly Plans. No Per-Job Fees.",
    description:
      "Starter Free · Pro R599/mo · Premium R1,299/mo. No commissions, no setup fees, no lock-in. 30-day money-back guarantee on Pro and Premium.",
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
      name: "Starter",
      priceCurrency: "ZAR",
      price: "0",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      description: "25 qualified leads per month. Digital assistant platform, email lead delivery, POPIA compliant. Free forever.",
      availability: "https://schema.org/InStock",
      url: "https://www.qwikly.co.za/pricing",
    },
    {
      "@type": "Offer",
      name: "Pro",
      priceCurrency: "ZAR",
      price: "599",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      description: "200 qualified leads per month. Custom branding, custom greeting and qualifying questions, lead exports, priority support.",
      availability: "https://schema.org/InStock",
      url: "https://www.qwikly.co.za/pricing",
    },
    {
      "@type": "Offer",
      name: "Premium",
      priceCurrency: "ZAR",
      price: "1299",
      priceSpecification: { "@type": "UnitPriceSpecification", billingDuration: "P1M" },
      description: "Unlimited qualified leads. Everything in Pro plus API access, dedicated support, and upcoming WhatsApp routing and calendar integration.",
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
        text: "No. Qwikly charges a flat monthly rate only. No commissions, no per-job fees. Top-ups are available at R20 per extra lead if you exceed your monthly cap.",
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
