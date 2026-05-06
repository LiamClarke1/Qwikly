import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  const { error } = await sb
    .from("clients")
    .update({
      google_access_token: null,
      google_refresh_token: null,
      google_token_expiry: null,
      google_calendar_id: null,
    })
    .eq("id", "1");
  if (error) {
    console.log("❌ Failed to clear:", error);
    process.exit(1);
  }
  console.log("✓ Cleared Google OAuth tokens on client_id=1.");
})();
