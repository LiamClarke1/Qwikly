import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

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
      {/* Widget config globals — must run before the script */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script dangerouslySetInnerHTML={{ __html: 'window.__QW_CLIENT="1";window.__QW_API="/api";' }} />
      {/* Load widget after globals are set */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/widget/widget.js" defer />
    </div>
  );
}
