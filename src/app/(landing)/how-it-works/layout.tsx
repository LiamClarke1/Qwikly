import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "Qwikly sits on your website, replies to every visitor in 30 seconds, qualifies them as a lead, and delivers their details straight to your inbox. Here's how.",
  alternates: { canonical: "https://www.qwikly.co.za/how-it-works" },
  openGraph: {
    title: "How Qwikly Works",
    description:
      "Add Qwikly to your website. It replies, qualifies, and captures every lead automatically. 24/7.",
    url: "https://www.qwikly.co.za/how-it-works",
  },
};

export default function HowItWorksLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
