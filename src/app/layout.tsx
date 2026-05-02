import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import CookieBanner from "@/components/CookieBanner";
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

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  interactiveWidget: "resizes-visual",
};

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
    "Qwikly is the AI assistant for your website. It captures every lead, qualifies them, and books them in — even when you're asleep. Flat monthly plans from free. No per-job fees, ever.",
  keywords: [
    "website chat widget South Africa",
    "lead capture widget South Africa",
    "digital assistant for websites",
    "website lead generation South Africa",
    "service business booking software",
    "electrician booking software",
    "plumber booking software",
    "digital assistant for tradespeople",
    "never miss a lead",
    "website visitor capture South Africa",
  ],
  openGraph: {
    title: "Qwikly | Never Miss a Lead Again",
    description:
      "The AI assistant for your website. Captures every lead, qualifies them, books them in. Flat monthly plans from free. No per-job fees, ever.",
    type: "website",
    url: "https://www.qwikly.co.za",
    siteName: "Qwikly",
    locale: "en_ZA",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Qwikly — digital assistant for South African service businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Qwikly | Never Miss a Lead Again",
    description:
      "Replies to every WhatsApp lead in 30 seconds. Books the job. Pay only when the calendar fills.",
    images: ["/og-image.png"],
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

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Qwikly",
  alternateName: "Clarke Agency",
  url: "https://www.qwikly.co.za",
  logo: "https://www.qwikly.co.za/og-image.png",
  description:
    "Digital assistant for South African service businesses. Replies to WhatsApp and email leads in 30 seconds, qualifies them, and books jobs.",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Johannesburg",
    addressCountry: "ZA",
  },
  contactPoint: {
    "@type": "ContactPoint",
    email: "hello@qwikly.co.za",
    contactType: "customer support",
    availableLanguage: "English",
    areaServed: "ZA",
  },
  sameAs: [],
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
      </head>
      <body className="antialiased bg-paper text-ink">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
