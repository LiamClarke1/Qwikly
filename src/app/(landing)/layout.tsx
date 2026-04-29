import Script from "next/script";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// Qwikly's own client ID — we eat our own cooking
const QWIKLY_CLIENT_ID = "1";
// Widget appends /web/branding, /web/intake, /web/event — point at /api
const WIDGET_API = process.env.NEXT_PUBLIC_SITE_URL
  ? `${process.env.NEXT_PUBLIC_SITE_URL}/api`
  : "http://localhost:3001/api";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-sans text-ink bg-paper antialiased">
      <Navbar />
      <main>{children}</main>
      <Footer />
      <Script
        src="/widget/widget.js"
        data-client={QWIKLY_CLIENT_ID}
        data-api={WIDGET_API}
        strategy="afterInteractive"
      />
    </div>
  );
}
