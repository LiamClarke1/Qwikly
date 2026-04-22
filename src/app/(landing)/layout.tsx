import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export default function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="font-sans text-text-dark bg-bg-light">
      <Navbar />
      <main>{children}</main>
      <Footer />
    </div>
  );
}
