import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import Script from "next/script";

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
      {/* next/script preserves data-* attributes and handles deferred loading correctly */}
      <Script
        src="/widget/widget.js"
        data-client="1"
        data-api="/api"
        strategy="afterInteractive"
      />
    </div>
  );
}
