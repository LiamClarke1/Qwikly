import type { Metadata } from "next";
import { Poppins, Open_Sans } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

const openSans = Open_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-opensans",
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
    <html lang="en" className={`${poppins.variable} ${openSans.variable}`}>
      <body className="font-body text-foreground bg-background antialiased pt-16">
        <Navbar />
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  );
}
