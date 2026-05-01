import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WidgetLoader from "@/components/WidgetLoader";

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
      <WidgetLoader />
    </div>
  );
}
