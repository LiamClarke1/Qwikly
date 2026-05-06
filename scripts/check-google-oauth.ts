import { config } from "dotenv";
config({ path: ".env.local" });
import { createClient } from "@supabase/supabase-js";
import { calendarClient } from "../src/lib/google-calendar";

const sb = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

(async () => {
  const { data: client } = await sb
    .from("clients")
    .select("id, google_access_token, google_refresh_token, google_calendar_id, google_token_expiry")
    .eq("id", "1")
    .maybeSingle();
  if (!client?.google_access_token) {
    console.log("No Google OAuth on client_id=1.");
    return;
  }

  // Hit Google's userinfo to find out which account this token belongs to
  const ui = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${client.google_access_token}` },
  });
  const userinfo = await ui.json();
  console.log("Google account currently OAuth'd to client_id=1:");
  console.log("  email:        ", userinfo.email);
  console.log("  name:         ", userinfo.name);
  console.log("  verified:     ", userinfo.verified_email);
  console.log("  google_calendar_id (DB): ", client.google_calendar_id || "(empty → primary)");

  // Also peek at primary calendar's actual id (which is usually = account email)
  const cal = calendarClient(
    client.google_access_token,
    client.google_refresh_token ?? "",
    client.google_token_expiry,
    "1"
  );
  const calMeta = await cal.calendars.get({ calendarId: "primary" });
  console.log("  primary calendar id:     ", calMeta.data.id);
  console.log("  primary calendar tz:     ", calMeta.data.timeZone);
})();
