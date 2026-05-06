import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import WidgetLoader from "@/components/WidgetLoader";
import { supabaseAdmin } from "@/lib/supabase-server";

const PUBLIC_KEY = "qw_pk_deab090596b4";

export default async function LandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const db = supabaseAdmin();
  const { data } = await db
    .from("clients")
    .select("id")
    .eq("public_key", PUBLIC_KEY)
    .maybeSingle();

  const clientId = data?.id ? String(data.id) : "";

  return (
    <div className="font-sans text-ink bg-paper antialiased">
      <Navbar />
      <main>{children}</main>
      <Footer />
      <WidgetLoader clientId={clientId} />
    </div>
  );
}
