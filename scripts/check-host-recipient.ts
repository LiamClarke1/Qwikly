import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  const env = (process.env.QWIKLY_OWN_NOTIFICATION_EMAIL ?? "").trim();
  console.log("env QWIKLY_OWN_NOTIFICATION_EMAIL:", env || "(unset)");

  const { data: client } = await sb
    .from("clients")
    .select("id, business_name, auth_user_id, contact_email, notification_email")
    .eq("id", "1")
    .maybeSingle();
  console.log("clients row:", client);

  if (client?.auth_user_id) {
    const { data: business } = await sb
      .from("businesses")
      .select("id, name, contact_email, notification_email, lead_emails_enabled")
      .eq("user_id", client.auth_user_id)
      .maybeSingle();
    console.log("businesses row:", business);
  }

  // Also check auth.users for the email
  const { data: { user } } = await sb.auth.admin.getUserById(client?.auth_user_id ?? "");
  console.log("auth.users email:", user?.email);
})();
