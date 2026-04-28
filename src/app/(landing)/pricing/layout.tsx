import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Qwikly charges 8% per booked job — R150 minimum, R5,000 cap. No subscription, no setup fee, no contract. Pay only when a job lands in your calendar.",
  alternates: { canonical: "https://www.qwikly.co.za/pricing" },
  openGraph: {
    title: "Qwikly Pricing — 8% Per Booking",
    description:
      "No subscription. No setup fee. 8% per booked job, R150 min, R5,000 cap. Pay only when you earn.",
    url: "https://www.qwikly.co.za/pricing",
  },
};

export default function PricingLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
