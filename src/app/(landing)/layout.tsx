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
      {/* Set widget config as globals before the script loads */}
      <script dangerouslySetInnerHTML={{ __html: 'window.__QW_CLIENT="1";window.__QW_API="/api";' }} />
      <Script src="/widget/widget.js" strategy="afterInteractive" />
    </div>
  );
}
