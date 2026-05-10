import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qwikly Pipeline, booked sales calls every week",
  description:
    "Qwikly Pipeline finds your ideal buyers, writes a personal email to each one, and books qualified meetings on your calendar. Built for SA agencies, consultants, SaaS, and high-ticket service firms.",
  alternates: { canonical: "https://www.qwikly.co.za/pipeline" },
  openGraph: {
    title: "Qwikly Pipeline, booked sales calls every week",
    description:
      "We find your ideal buyers, write a personal email to each one, and book qualified meetings on your calendar. POPIA compliant. ZAR pricing.",
    url: "https://www.qwikly.co.za/pipeline",
  },
};

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
