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
      {/* Qwikly eats its own cooking — relative /api works on localhost + production */}
      <script
        src="/widget/widget.js"
        data-client="1"
        data-api="/api"
        defer
      />
    </div>
  );
}
