import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WidgetLoader from "@/components/WidgetLoader";

const PUBLIC_KEY = "qw_pk_deab090596b4";

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
      <WidgetLoader publicKey={PUBLIC_KEY} />
    </div>
  );
}
