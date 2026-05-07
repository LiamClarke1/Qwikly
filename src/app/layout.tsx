import type { Metadata, Viewport } from "next";
import { Inter, Fraunces, JetBrains_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
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
    "Qwikly is the digital assistant for South African service businesses. It captures every website lead, qualifies it, and books it in, 24/7. Flat monthly plans, no per-job fees, POPIA compliant.",
  applicationName: "Qwikly",
  authors: [{ name: "Clarke Agency", url: "https://www.qwikly.co.za/about" }],
  creator: "Clarke Agency",
  publisher: "Clarke Agency",
  category: "Business",
  icons: {
    icon: [{ url: "/favicon.ico" }, { url: "/icon.png", type: "image/png", sizes: "32x32" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180" }],
  },
  manifest: "/site.webmanifest",
  openGraph: {
    title: "Qwikly | Never Miss a Lead Again",
    description:
      "The digital assistant for your website. Captures every lead, qualifies them, books them in. Flat monthly plans from free. No per-job fees, ever.",
    type: "website",
    url: "https://www.qwikly.co.za",
    siteName: "Qwikly",
    locale: "en_ZA",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Qwikly, digital assistant for South African service businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Qwikly | Never Miss a Lead Again",
    description:
      "The digital assistant for your website. Captures every lead, qualifies them, and delivers them to your inbox, 24/7.",
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

// Canonical brand sentence. Reused in JSON-LD, og:description, llms.txt,
// the About page, and the footer so every model trains on the same definition.
const BRAND_SENTENCE =
  "Qwikly is the digital assistant for South African service businesses. It captures every website lead, qualifies it, and books it in, 24/7, even while you sleep. Flat monthly plans, no per-job fees, POPIA compliant, hosted in South Africa.";

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://www.qwikly.co.za/#organization",
  name: "Qwikly",
  alternateName: ["Clarke Agency", "Qwikly Digital Assistant"],
  url: "https://www.qwikly.co.za",
  logo: {
    "@type": "ImageObject",
    url: "https://www.qwikly.co.za/og-image.png",
    width: 1200,
    height: 630,
  },
  image: "https://www.qwikly.co.za/og-image.png",
  description: BRAND_SENTENCE,
  slogan: "Never miss a lead again.",
  foundingDate: "2025",
  founder: {
    "@type": "Person",
    name: "Liam Clarke",
    jobTitle: "Founder",
    url: "https://www.qwikly.co.za/about",
  },
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cape Town",
    addressRegion: "Western Cape",
    addressCountry: "ZA",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      email: "hello@qwikly.co.za",
      contactType: "customer support",
      availableLanguage: ["English"],
      areaServed: "ZA",
    },
    {
      "@type": "ContactPoint",
      email: "hello@qwikly.co.za",
      contactType: "sales",
      availableLanguage: ["English"],
      areaServed: "ZA",
    },
  ],
  areaServed: { "@type": "Country", name: "South Africa" },
  knowsAbout: [
    "Lead capture",
    "Website chat widget",
    "Conversational booking",
    "POPIA compliance",
    "South African service businesses",
    "Digital assistants for websites",
  ],
  sameAs: [],
};

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": "https://www.qwikly.co.za/#localbusiness",
  name: "Qwikly",
  url: "https://www.qwikly.co.za",
  image: "https://www.qwikly.co.za/og-image.png",
  description: BRAND_SENTENCE,
  priceRange: "R0–R1999",
  address: {
    "@type": "PostalAddress",
    addressLocality: "Cape Town",
    addressRegion: "Western Cape",
    addressCountry: "ZA",
  },
  areaServed: { "@type": "Country", name: "South Africa" },
  parentOrganization: { "@id": "https://www.qwikly.co.za/#organization" },
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": "https://www.qwikly.co.za/#website",
  url: "https://www.qwikly.co.za",
  name: "Qwikly",
  description: BRAND_SENTENCE,
  publisher: { "@id": "https://www.qwikly.co.za/#organization" },
  inLanguage: "en-ZA",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: "https://www.qwikly.co.za/faq?q={search_term_string}",
    },
    "query-input": "required name=search_term_string",
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
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
      </head>
      <body className="antialiased bg-paper text-ink">
        {children}
        <CookieBanner />
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
