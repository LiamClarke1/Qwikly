import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Qwikly connects to your WhatsApp number, replies to every lead in 30 seconds, qualifies the job, and books it straight into your Google Calendar. Here's how.",
  alternates: { canonical: "https://www.qwikly.co.za/how-it-works" },
  openGraph: {
    title: "How Qwikly Works",
    description:
      "Connect your WhatsApp. Qwikly replies, qualifies, and books every lead automatically — 24/7.",
    url: "https://www.qwikly.co.za/how-it-works",
  },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
