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
  title: "Qwikly | Never Miss a Lead Again",
  description:
    "Qwikly replies to every WhatsApp and email lead in 30 seconds, qualifies them, and books the appointment into your Google Calendar. Built for South African service businesses. Pay only when a job is booked.",
  keywords: [
    "WhatsApp lead response",
    "email lead response",
    "AI appointment booking",
    "service business leads",
    "South Africa",
    "electrician leads",
    "plumber leads",
  ],
  openGraph: {
    title: "Qwikly | Never Miss a Lead Again",
    description:
      "Replies to every WhatsApp and email lead in 30 seconds. Books the job. Pay only when the calendar fills.",
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
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} ${jetbrains.variable}`}
    >
      <body className="antialiased bg-paper text-ink">{children}</body>
    </html>
  );
}
