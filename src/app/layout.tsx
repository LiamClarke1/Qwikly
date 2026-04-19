import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Qwikly | Never Miss a WhatsApp Lead Again",
  description:
    "AI-powered WhatsApp assistant that replies to every lead in 30 seconds, qualifies them, and books appointments into your Google Calendar. Built for South African service businesses.",
  keywords: [
    "WhatsApp lead response",
    "AI appointment booking",
    "service business leads",
    "South Africa",
    "electrician leads",
    "plumber leads",
  ],
  openGraph: {
    title: "Qwikly | Never Miss a WhatsApp Lead Again",
    description:
      "AI-powered WhatsApp assistant for South African service businesses. 30-second replies. Automatic booking. Pay per appointment.",
    type: "website",
    locale: "en_ZA",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans text-text-dark bg-bg-light antialiased pt-16">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
