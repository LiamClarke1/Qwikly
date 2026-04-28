import type { Metadata } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["SOFT", "opsz"],
  variable: "--font-fraunces",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.qwikly.co.za"),
  verification: {
    google: "tczIM2WulV3rRXOHYYDCnONsEPUKckjx-U2WTu5xy2w",
  },
  title: {
    default: "Qwikly | Never Miss a Lead Again",
    template: "%s | Qwikly",
  },
  description:
    "Qwikly replies to every WhatsApp and email lead in 30 seconds, qualifies them, and books the job into your calendar. Built for South African service businesses. Pay only when a job is booked — 8% per booking, R150 min, R5,000 cap.",
  keywords: [
    "WhatsApp lead response South Africa",
    "AI booking system South Africa",
    "automated WhatsApp reply",
    "lead follow-up automation",
    "service business booking software",
    "electrician booking software",
    "plumber booking software",
    "AI assistant for tradespeople",
    "never miss a lead",
    "WhatsApp booking South Africa",
  ],
  openGraph: {
    title: "Qwikly | Never Miss a Lead Again",
    description:
      "Replies to every WhatsApp lead in 30 seconds. Books the job. Pay only when the calendar fills — 8% per booking.",
    type: "website",
    url: "https://www.qwikly.co.za",
    siteName: "Qwikly",
    locale: "en_ZA",
  },
  twitter: {
    card: "summary_large_image",
    title: "Qwikly | Never Miss a Lead Again",
    description:
      "Replies to every WhatsApp lead in 30 seconds. Books the job. Pay only when the calendar fills.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
    },
  },
  alternates: {
    canonical: "https://www.qwikly.co.za",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased bg-paper text-ink">{children}</body>
    </html>
  );
}
