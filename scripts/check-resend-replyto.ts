import { config } from "dotenv";
config({ path: ".env.local" });
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);
const FROM = process.env.RESEND_FROM!;

async function send(label: string, opts: Parameters<typeof resend.emails.send>[0]) {
  console.log(`\n--- ${label} ---`);
  const { data, error } = await resend.emails.send(opts);
  if (error) console.log("❌", error);
  else console.log("✓", data);
}

(async () => {
  // Variant 1: minimal — no replyTo
  await send("A: minimal, no replyTo", {
    from: FROM,
    to: "clarkeagency1@outlook.com",
    subject: "Qwikly probe A",
    html: "<p>A</p>",
  });

  // Variant 2: with replyTo set to API key owner's address
  await send("B: with replyTo=liamclarke21", {
    from: FROM,
    to: "clarkeagency1@outlook.com",
    replyTo: "liamclarke21@outlook.com",
    subject: "Qwikly probe B",
    html: "<p>B</p>",
  });

  // Variant 3: with replyTo set to a different address
  await send("C: with replyTo=hello@qwikly.co.za", {
    from: FROM,
    to: "clarkeagency1@outlook.com",
    replyTo: "hello@qwikly.co.za",
    subject: "Qwikly probe C",
    html: "<p>C</p>",
  });
})();
