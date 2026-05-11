import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Qwikly Pipeline, daily hand-picked prospects",
  description:
    "Qwikly Pipeline (Outbound) delivers a daily hand-picked list of ideal prospects to your inbox. Built for SA agencies, consultants, SaaS, and high-ticket service firms.",
  alternates: { canonical: "https://www.qwikly.co.za/pipeline" },
  openGraph: {
    title: "Qwikly Pipeline, daily hand-picked prospects",
    description:
      "A daily hand-picked list of ideal prospects in your inbox. POPIA compliant. ZAR pricing.",
    url: "https://www.qwikly.co.za/pipeline",
  },
};

export default function PipelineLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
