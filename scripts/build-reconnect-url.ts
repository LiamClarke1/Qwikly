import { config } from "dotenv";
config({ path: ".env.local" });
import { createHmac } from "crypto";
import { google } from "googleapis";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
];

const CLIENT_ID = "1";
const TARGET_GOOGLE = "liamclarke21@outlook.com";

const cronSecret = process.env.CRON_SECRET!;
const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").trim();

const hmac = createHmac("sha256", cronSecret).update(CLIENT_ID).digest("hex");
const state = `${CLIENT_ID}.${hmac}`;

const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${siteUrl}/api/calendar/callback`
);

const url = auth.generateAuthUrl({
  access_type: "offline",
  scope: SCOPES,
  prompt: "consent",
  state,
  login_hint: TARGET_GOOGLE,
});

console.log("\n=== ONE-CLICK RECONNECT URL ===\n");
console.log("Open this URL in your browser:\n");
console.log(url);
console.log("\nGoogle will land on liamc7250@gmail.com automatically.");
console.log("Approve the 3 calendar scopes. You'll be redirected back to qwikly.co.za.\n");
