import type { Metadata } from "next";
import { buildFAQSchema, FAQ_DATA } from "@/lib/faq-data";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Qwikly charges 8% per booked job. R150 minimum, R5,000 cap. No subscription, no setup fee, no contract. Pay only when a job lands in your calendar.",
  alternates: { canonical: "https://www.qwikly.co.za/pricing" },
  openGraph: {
    title: "Qwikly Pricing, 8% Per Booking",
    description:
      "No subscription. No setup fee. 8% per booked job, R150 min, R5,000 cap. Pay only when you earn.",
    url: "https://www.qwikly.co.za/pricing",
  },
};

const productSchema = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "Qwikly AI Receptionist",
  description:
    "AI-powered lead response and booking system for South African service businesses. Replies to WhatsApp and email leads in 30 seconds, qualifies them, and books appointments.",
  brand: { "@type": "Brand", name: "Qwikly" },
  offers: {
    "@type": "Offer",
    priceCurrency: "ZAR",
    price: "0",
    description: "8% commission per booking. R150 minimum. R5,000 maximum. No monthly fee.",
    availability: "https://schema.org/InStock",
    url: "https://www.qwikly.co.za/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  const faqSchema = buildFAQSchema(FAQ_DATA);
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
