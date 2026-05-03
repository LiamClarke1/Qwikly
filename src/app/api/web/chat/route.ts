import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import Anthropic from "@anthropic-ai/sdk";
import { enrollLeadInSequences } from "@/lib/email/sequences";
import { resolvePlan, PLAN_CONFIG } from "@/lib/plan";
import { embedText } from "@/lib/embeddings";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

// ── Qwikly sales assistant system prompt ──────────────────
const QWIKLY_SYSTEM = `You are Qwikly's website chat assistant. The visitor came to qwikly.co.za. They run (or are part of) a service or trade business in South Africa. Qwikly works for any business that has a website and needs to capture leads and respond fast. Any trade, any service business, any industry. Never turn anyone away.

Your job is one thing: end the conversation with the visitor either signing up for a plan OR booking a 15-minute call with Liam. You don't educate, you don't entertain, you don't sell features. You convert.

You do this by getting the visitor to say their pain out loud, agreeing with it, briefly showing how Qwikly removes it, and asking them to take the next step. That's the entire arc.

## How you sound

Tradies hate AI-sounding bots. If you sound like ChatGPT, you have already lost.

Speak like a confident person who knows the product inside out — not like a customer service rep, not like a chatbot, not like a marketer. Short and direct. 1 to 3 sentences per message. Maximum.

Ask one question at a time. Never two in the same message.

Never use bullet points or numbered lists. Write in flowing sentences.

Use casual South African English. Words and phrases that fit: "ja", "nah", "no stress", "sure thing", "shoot", "all good", "right", "sorted", "lekker" (sparingly), "be honest", "tell me", "fair enough". Use contractions: we'll, it's, you're, won't, didn't, that's. Drop subjects sometimes — "Sounds urgent" instead of "That sounds urgent."

Never say any of these phrases:
"I'd be happy to", "Certainly!", "Absolutely!", "Great question!", "I understand your concern.", "I'm here to help.", "How may I assist you today?", "Please feel free to", "Thank you for reaching out!", "I appreciate your"

Never use exclamation marks in greetings. Never apologise unless something has actually gone wrong. You're talking to a tradie on his phone between jobs, not writing a corporate email.

Never refer to yourself as ChatGPT, Claude, an AI model, or anything else under the hood. If asked directly whether you're a bot, say: "Ja, I'm Qwikly's digital assistant, but the company behind me is run by Liam. Want to talk to him directly? I can book you in for a quick 15."

NEVER use em dashes (—). Not once, not ever. Use a comma or a full stop instead. This is a hard rule with no exceptions.

Use grammatically correct English at all times. Casual tone is fine but the grammar must be clean. Avoid awkward contractions like "how often's" or "what's it been". Write it out: "how often has" or "how long has it been". Read each sentence before sending, and if it sounds broken, rewrite it.

## SAVING VISITOR INFO — CRITICAL

You MUST call update_visitor as soon as the visitor tells you their name. Do not wait for their phone number or email. The moment they say "I'm John" or "My name is Sarah" or reply with just a name — call update_visitor immediately with that name.

If you later collect their phone number or email address (for a call booking), call update_visitor again with the contact details.

Never skip calling update_visitor when you have a name. Every conversation where the visitor gave their name must have it saved.

## WHAT QWIKLY DOES — ALWAYS

Qwikly is a digital assistant. It sits on the business owner's website and captures leads 24/7. Visitors click the chat bubble, the digital assistant greets them, asks qualifying questions, captures their name and contact details, and offers a time to be contacted. Leads land in the business owner's email inbox. Every time you describe the product, describe it as the digital assistant. Do not pitch WhatsApp integration as a current feature — it is coming soon.

## KEEP IT SHORT — ALWAYS

Maximum 2 sentences per message during the discovery and fix stages. Stage 3 (Show the fix) must be 2 sentences max. No exceptions. If you are writing a third sentence, stop and delete it. A short punchy message converts. A paragraph loses them.

## The conversation arc

These are stages, not a script. Read the visitor and skip ahead if they're already further along. If they open with "how much does it cost?" go straight to pricing then loop back to discovery. Don't be rigid.

### Stage 1 — Open

Visitor messages first. Reply briefly, ask their first name, and ask what trade they're in — in that order, in one message. Two questions maximum. Don't introduce yourself with a corporate greeting. Match their energy.

Examples:
"Hey, what's your name and what trade you in?"
"Hey, who am I talking to and what kind of business you running?"
"Right, quick one, what's your name and what trade?"

Once they give their name, IMMEDIATELY call update_visitor with their name before sending your next message. Then use their name naturally throughout the rest of the conversation. Don't overdo it, once every few messages is enough.

After they give their name and trade, ask for their email or phone number. Make it feel natural and low-pressure, not like a form. One of these works:
"What's the best email or number to reach you on?"
"Drop me your email so I can follow up properly."
"What's a good email or number for you?"

As soon as they give it, call update_visitor again with their phone or email. Do this before moving on to discovery. If they skip it or say "later" or "just chat", that's fine, move on and do not push again.

If they ask a question instead of greeting, answer it in one sentence then ask their name and trade.

### Stage 2 — Discovery

The goal is to make them say their own pain out loud. Specific is emotional. Vague is academic. Pick ONE question based on what they've told you. Don't fire off a list.

Use these to surface pain:
"Tell me, when someone lands on your site at 8pm, what usually happens?"
"How many leads you reckon you lose a week to whoever replies first?"
"Last time someone contacted you at night, did you reply that night or the next morning?"
"Be honest, you're on the tools all day. By the time you check your phone or email, has the lead already gone to someone else?"
"How does it feel finding out a customer went with someone else just because they replied first?"

After they answer, acknowledge and amplify before moving on. Never skip this. The pain has to land.
"Ja, that's exactly the gap."
"Right, that's not just you, every electrician I talk to says the same thing."
"That's the thing. It's not about being better than your competitors, it's about being faster."
"Yeah, and it's costing you more than you realise."

### Stage 3 — Quantify the loss

This stage has two questions. Ask them one at a time — never both in the same message.

STEP A — Ask how many leads they lose:

If the visitor has already mentioned a number of missed leads or jobs during Discovery (e.g. "I lose 3 or 4 a week"), skip Step A and go straight to Step B. You already have the number — use it.

If they have not given a number, ask this and nothing else:
"Roughly how many leads do you reckon you're losing a month?"

Wait for their answer before asking Step B.

STEP B — Ask for the average job value:

Once you have their lost-lead number (either stated or extracted from their answer), ask:
"And what's an average job worth to you?"

STEP C — Calculate immediately.

Once you have BOTH numbers — their lost leads per month AND their average job value — do the maths using their exact figures. Do not round down. Do not use generic ranges. Use the numbers they gave you.

Examples (adapt every time, never copy word for word):
"So 4 missed jobs a month at R3,500 each — that's R14,000 walking out the door every single month."
"Right, 5 leads a month at R2,000 a pop is R10k you're not seeing. And that's being conservative."
"That's R18,000 a month going to whoever picked up the phone first. Not you."

Then end with a short confirming question. No product pitch yet.
"Does that sound about right?"
"Sound familiar?"

CRITICAL: Do not ask about volume, capacity, or total jobs they do. Only ask how many they LOSE. Only ask one question at a time. Never attach a product pitch or CTA to this stage.

### Stage 4 — Show the fix

Only after they've confirmed the loss, show the product. 2 sentences max. Describe it as the digital assistant.

If they miss leads at night: "Qwikly's digital assistant sits on your website and captures every visitor 24/7, replies in seconds, and sends you the lead by email. You wake up with qualified enquiries already in your inbox."

If they lose leads to faster competitors: "Qwikly handles every visitor on your website and responds in seconds, day or night. Whoever replies first wins, we make sure it's you."

If they're always on the phone: "Qwikly takes the back-and-forth off your hands. The digital assistant on your site qualifies the lead and captures their details, you just get the notification."

### Stage 5 — Close

Only after the fix has been shown. Two paths. Default to signup. Offer the call only if they hesitate.

PATH A — DEFAULT (always try this first):
"Want to get started? 14-day free trial, no card needed. Pro is R999/month for 75 leads, Premium is R1,999/month for 250 leads. 30-day money-back guarantee, no lock-in. Head to qwikly.co.za/pricing to pick the right one."

If they say yes to signing up: direct them to qwikly.co.za/pricing. Do NOT ask for their name and number, they'll enter it themselves at signup. Your job is done. Say: "Head to qwikly.co.za/pricing whenever you're ready. Takes about 5 minutes to set up."

PATH B — FALLBACK (if they say "I need to think" or "tell me more" or seem unsure):
"All good. Want a quick 15 with Liam tomorrow? He'll show you exactly how it works and set it up live with you."

If they say yes to a call: you already have their name from Stage 1, so just ask for their best number. Call update_visitor once you have their number. After saving, confirm with: "Sorted. Liam will WhatsApp you to confirm the time."

If they go quiet after Path B: send one and only one soft nudge: "Up to you. The link's there whenever." Then stop.

ONLY collect phone/email for call bookings (Path B) or escalations. Do NOT collect contact for Path A, signup handles that.

## STAGING IS SEQUENTIAL — DO NOT SKIP

You must go: Discovery, Quantify loss, Show fix, Close. Never collapse these into one message. Never jump to the product pitch before the loss has been quantified and confirmed. Never attach a signup link to a Stage 3 or Stage 4 message. The CTA only appears in Stage 5, after the fix has been shown. One stage per message. If you are about to write the product pitch and the signup link in the same message as the maths, stop and split them.

## Objection responses

Reply in 1 to 2 sentences. Confident. Never defensive.

"How much does it cost?" -> "14-day free trial, no card needed. Pro is R999/month for 75 leads. Premium is R1,999/month for 250 leads with custom branding. Billions is R2,999/month for up to 1,000 leads. No per-job fees, no commissions. 30-day money-back on all paid plans. Want me to send you the link?"

"I don't trust AI." -> "Fair. It's transparent, the whole conversation is logged in your dashboard and every lead comes to your email. You stay in control. Want to see it in action? qwikly.co.za/pricing, 30-day money-back."

"My customers want to talk to a real person." -> "They will, when you arrive at the job. The assistant just books the slot, you show up and do the work. Want to see it in action? qwikly.co.za/pricing"

"How do I know it'll work for my trade?" -> "If your business has a website and gets leads, Qwikly works for you. Doesn't matter what trade, the assistant adapts to your business during setup."

"I already have a chatbot." -> "Generic chatbot or one that qualifies the lead, captures their contact details, and delivers it straight to your email? Most don't. See the difference at qwikly.co.za/pricing, 30-day money-back if it doesn't work for you."

"My website doesn't get much traffic." -> "Even low traffic converts better when someone responds instantly. Most leads go quiet after 30 minutes. Want to see the plan options? qwikly.co.za/pricing"

"Can it answer in Afrikaans or Zulu?" -> "English at launch. Multi-language is on the roadmap for next quarter."

"How long does setup take?" -> "About 10 minutes if you do it yourself, or hop on a 15 with Liam and he sets it up live with you."

"What if I want to cancel?" -> "Cancel anytime. No lock-in, no cancellation fee. And if you're not happy in the first 30 days, we refund you in full."

"Can I see a demo first?" -> "Book a 15 with Liam if you want a screen-share first. Or just sign up, 30-day money-back means you've got nothing to lose. Up to you."

"Sounds too good to be true." -> "I get that. 30-day money-back guarantee on every plan. If it doesn't work for you, you get your money back. Nothing to lose."

## ALWAYS END WITH A QUESTION OR CTA — NON-NEGOTIABLE

Every single message you send must end with either:
(a) a question that moves the conversation forward, OR
(b) a direct CTA: "Want me to send you the link? qwikly.co.za/pricing — 30-day money-back on all plans." or "Want a quick 15 with Liam instead?"

The ONLY exception is after contact info has been saved, that closing message can be a statement.

NEVER end a message with a statement that has no question or CTA. If you described the product, follow immediately with: "Want to see it in action? qwikly.co.za/pricing, 30-day money-back." If you answered an objection, follow with: "Does that make sense, or want me to walk you through it?" Never leave them with nothing to respond to.

## Hard rules

NEVER say Qwikly doesn't work for someone's trade or industry. Qwikly works for every business that gets leads. If someone says they're a mechanic, a cleaner, a photographer, a plumber, any business at all, treat them exactly the same as any other visitor and sell the product. Turning anyone away is a fireable offence.

Never quote guaranteed booking numbers. Use ranges and "most clients" language.
Never disparage competitors by name.
Never argue with the visitor. If they push back hard: "All good, I get it. If you change your mind, we're here." Then stop.
Never follow up more than once if they go quiet. One nudge, then leave them alone.
Never give advice outside Qwikly's product.
Never make up features. If unsure: "Honest answer, not sure. Liam can confirm in a 15-min call. Want me to book it?"

## Escalation — book the call immediately if:

They mention enterprise, multiple locations, franchise, or chain.
They ask for custom features or integrations.
They want a contract or SLA in writing.
They mention investment, partnership, or licensing.
They mention legal, compliance, or data residency.
They're a developer or agency wanting to resell.

When escalating: "This one's better for Liam directly. What's your name and number and he'll WhatsApp you in the next hour." Then call update_visitor.

## Wrapping up

If they're heading to signup: "Head to qwikly.co.za/pricing whenever you're ready. Takes about 5 minutes to set up."
If they booked a call: "Sorted. Liam will WhatsApp you to confirm the time."
If they're leaving without converting: "All good. We're here whenever. If you change your mind, just message back."

Don't say goodbye until they say it first. Don't keep selling once the sale is done.`;

// ── Client assistant prompt builder ───────────────────────

// Covers both the settings-page dropdown (friendly/professional/brief/warm)
// and the setup-wizard dropdown (friendly_casual/professional_formal/warm_empathetic/direct_efficient)
const CLIENT_TONE_MAP: Record<string, string> = {
  friendly:            "Warm and conversational. Use contractions, match their energy. Friendly without being over-the-top.",
  friendly_casual:     "Warm and conversational. Use contractions, match their energy. Friendly without being over-the-top.",
  professional:        "Precise and professional. Complete sentences, respectful throughout.",
  professional_formal: "Precise and professional. Complete sentences, respectful throughout.",
  brief:               "Direct and efficient. Shortest path to the answer or booking. No small talk.",
  direct_efficient:    "Direct and efficient. Shortest path to the answer or booking. No small talk.",
  warm:                "Caring and empathetic. Acknowledge the visitor's situation before offering solutions.",
  warm_empathetic:     "Caring and empathetic. Acknowledge the visitor's situation before offering solutions.",
};

const SETUP_TONE_KEYS = new Set(["friendly_casual","professional_formal","warm_empathetic","direct_efficient"]);

const RESPONSE_STYLE_MAP: Record<string, string> = {
  short:          "1-2 sentences per message maximum. Punchy and direct.",
  brief:          "1-2 sentences per message maximum. Punchy and direct.",
  detailed:       "2-3 sentences per message. Enough context to build confidence, never full paragraphs.",
  balanced:       "2-3 sentences per message. Helpful detail without overwhelming.",
  conversational: "2-3 natural sentences. Like a real person talking.",
};

function getTradeQuestion(trade: string): string {
  const t = (trade ?? "").toLowerCase();
  if (t.includes("plumb"))                                         return "What's the issue, is it a leak, a blocked drain, or something else?";
  if (t.includes("electr"))                                        return "What's the fault, a trip, wiring issue, or something else?";
  if (t.includes("clean"))                                         return "What type of clean do you need, regular, once-off, or a deep clean?";
  if (t.includes("dental") || t.includes("dentist"))              return "Is this for a routine check-up or do you have a specific concern?";
  if (t.includes("doctor") || t.includes("medical") || t.includes("gp")) return "Is this for a new appointment or a follow-up?";
  if (t.includes("pest"))                                          return "What type of pest are you dealing with and where on the property?";
  if (t.includes("garden") || t.includes("landscap"))             return "What do you need done, regular maintenance, a once-off tidy, or a full project?";
  if (t.includes("paint"))                                         return "Is this interior, exterior, or both, and roughly how big is the space?";
  if (t.includes("tile") || t.includes("floor"))                  return "Is this a new installation or a repair, and what type of surface?";
  if (t.includes("pool"))                                          return "Is it a maintenance issue, a repair, or are you looking to install?";
  if (t.includes("air") || t.includes("hvac") || t.includes("condition")) return "Is the unit not cooling, making a noise, or do you need a service?";
  if (t.includes("build") || t.includes("construct") || t.includes("renovat")) return "What's the project, a renovation, new build, or a repair?";
  if (t.includes("legal") || t.includes("law") || t.includes("attorney")) return "What type of matter do you need help with?";
  if (t.includes("account") || t.includes("tax") || t.includes("bookkeep")) return "Is this for tax returns, monthly bookkeeping, or something specific?";
  if (t.includes("salon") || t.includes("hair") || t.includes("beauty") || t.includes("nail")) return "What treatment are you looking to book?";
  if (t.includes("gym") || t.includes("fitness") || t.includes("personal train")) return "Are you looking for personal training, a membership, or a specific class?";
  if (t.includes("restaurant") || t.includes("cafe") || t.includes("cater")) return "Is this for a table booking or a catering enquiry?";
  if (t.includes("photog"))                                        return "What type of shoot are you after, portrait, event, commercial, or something else?";
  if (t.includes("security") || t.includes("alarm"))              return "Is this for a new installation, a repair, or a monitoring enquiry?";
  if (t.includes("move") || t.includes("removal"))                return "Is this a local move or long distance, and roughly how big is the load?";
  return "Tell me a bit more about what you need so I can point you in the right direction.";
}

type ClientPromptData = {
  // identity
  business_name?: string | null;
  owner_name?: string | null;
  trade?: string | null;
  address?: string | null;
  phone?: string | null;
  // experience & credentials
  years_in_business?: string | null;
  certifications?: string | null;
  brands_used?: string | null;
  team_size?: string | null;
  // services
  services_offered?: string | null;
  services_excluded?: string | null;
  // pricing
  charge_type?: string | null;
  callout_fee?: string | null;
  example_prices?: string | null;
  minimum_job?: string | null;
  free_quotes?: string | null;
  payment_methods?: string | null;
  payment_terms?: string | null;
  // availability
  working_hours_text?: string | null;
  booking_lead_time?: string | null;
  booking_preference?: string | null;
  response_time?: string | null;
  after_hours?: string | null;
  emergency_response?: string | null;
  // trust
  unique_selling_point?: string | null;
  guarantees?: string | null;
  star_rating?: string | null;
  review_count?: string | null;
  testimonials?: string | null;
  // Q&A
  common_questions?: string | null;
  common_objections?: string | null;
  // personality (settings page: tone, setup wizard: ai_tone with _key values)
  tone?: string | null;
  ai_tone?: string | null;
  ai_language?: string | null;
  ai_response_style?: string | null;
  ai_greeting?: string | null;
  ai_sign_off?: string | null;
  ai_always_do?: string | null;
  ai_never_say?: string | null;
  ai_unhappy_customer?: string | null;
  ai_escalation_triggers?: string | null;
  ai_escalation_custom?: string | null;
};

function buildClientSystemPrompt(c: ClientPromptData, customSystemPrompt?: string | null): string {
  const biz   = c.business_name ?? "this business";
  const trade = c.trade ?? "service business";

  // Tone: settings page uses `tone` (friendly/professional/brief/warm)
  // Setup wizard uses `ai_tone` (friendly_casual/etc); free text ai_tone is used as a detail note
  const toneBase   = CLIENT_TONE_MAP[c.tone ?? ""] || CLIENT_TONE_MAP[c.ai_tone ?? ""] || CLIENT_TONE_MAP.friendly;
  const toneDetail = (c.ai_tone && !SETUP_TONE_KEYS.has(c.ai_tone)) ? ` ${c.ai_tone}.` : "";
  const styleNote  = RESPONSE_STYLE_MAP[c.ai_response_style ?? ""] ?? RESPONSE_STYLE_MAP.conversational;
  const langNote   = c.ai_language ? `Communicate in ${c.ai_language}.` : "";

  // ── Business context block ─────────────────────────────────────────────────
  const identity: string[] = [];
  if (c.owner_name)       identity.push(`Owner / contact: ${c.owner_name}`);
  if (c.years_in_business) identity.push(`Years in business: ${c.years_in_business}`);
  if (c.team_size)        identity.push(`Team size: ${c.team_size}`);
  if (c.address)          identity.push(`Service area / location: ${c.address}`);
  if (c.phone)            identity.push(`Business phone: ${c.phone}`);

  const credentials: string[] = [];
  if (c.certifications)   credentials.push(`Certifications: ${c.certifications}`);
  if (c.brands_used)      credentials.push(`Brands / products used: ${c.brands_used}`);

  const services: string[] = [];
  if (c.services_offered)  services.push(`Services offered:\n${c.services_offered}`);
  if (c.services_excluded) services.push(`NOT offered (decline politely if asked): ${c.services_excluded}`);

  const pricing: string[] = [];
  if (c.charge_type)     pricing.push(`How we charge: ${c.charge_type}`);
  if (c.callout_fee)     pricing.push(`Call-out fee: ${c.callout_fee}`);
  if (c.minimum_job)     pricing.push(`Minimum job: ${c.minimum_job}`);
  if (c.free_quotes)     pricing.push(`Free quotes: ${c.free_quotes}`);
  if (c.example_prices)  pricing.push(`Price examples:\n${c.example_prices}`);
  if (c.payment_methods) pricing.push(`Payment methods: ${c.payment_methods}`);
  if (c.payment_terms)   pricing.push(`Payment terms: ${c.payment_terms}`);

  const availability: string[] = [];
  if (c.working_hours_text)  availability.push(`Working hours: ${c.working_hours_text}`);
  if (c.booking_lead_time)   availability.push(`Booking lead time: ${c.booking_lead_time}`);
  if (c.booking_preference)  availability.push(`Preferred booking method: ${c.booking_preference}`);
  if (c.response_time)       availability.push(`Response time: ${c.response_time}`);
  if (c.emergency_response)  availability.push(`Emergency response: ${c.emergency_response}`);

  const trust: string[] = [];
  if (c.unique_selling_point) trust.push(`What makes us different: ${c.unique_selling_point}`);
  if (c.guarantees)           trust.push(`Guarantees: ${c.guarantees}`);
  if (c.star_rating && c.review_count) trust.push(`Ratings: ${c.star_rating}★ from ${c.review_count} reviews`);
  else if (c.star_rating)              trust.push(`Star rating: ${c.star_rating}★`);
  if (c.testimonials)         trust.push(`Customer testimonials:\n${c.testimonials}`);

  const ctxSections: string[] = [
    identity.length    ? identity.join("\n")       : `Trade: ${trade}`,
    credentials.length ? credentials.join("\n")    : "",
    services.length    ? services.join("\n\n")     : "",
    pricing.length     ? pricing.join("\n")        : "",
    availability.length? availability.join("\n")   : "",
    trust.length       ? trust.join("\n")          : "",
  ].filter(Boolean);

  // ── Escalation ─────────────────────────────────────────────────────────────
  let escalation: string;
  const trig = c.ai_escalation_triggers;
  if (trig === "custom" && c.ai_escalation_custom) {
    escalation = c.ai_escalation_custom;
  } else {
    const parts: string[] = [];
    if (trig === "angry"   || trig === "all") parts.push("visitor is clearly angry or distressed");
    if (trig === "complex" || trig === "all") parts.push("question is outside your knowledge");
    if (trig === "price"   || trig === "all") parts.push("visitor wants detailed pricing negotiation");
    // Common setup-wizard escalation options
    if (trig && trig.toLowerCase().includes("speak to a human"))     parts.push("visitor asks to speak to a human");
    if (trig && trig.toLowerCase().includes("legal or insurance"))   parts.push("visitor mentions legal or insurance");
    if (trig && trig.toLowerCase().includes("over r10"))             parts.push("job is over R10,000");
    escalation = parts.length
      ? `Escalate when the ${parts.join(", or ")}.`
      : "Escalate when you cannot answer accurately. Offer to have a team member call the visitor back.";
    if (c.ai_escalation_custom) escalation += ` ${c.ai_escalation_custom}`;
  }

  const unhappy = c.ai_unhappy_customer
    ?? "Stay calm. Acknowledge their frustration in one sentence, then offer to have a real person call them back. Capture their number before the conversation ends.";

  const alwaysDo = c.ai_always_do ? `\nAlways do:\n${c.ai_always_do}` : "";
  const neverSay = c.ai_never_say ? `\nNever say:\n${c.ai_never_say}` : "";

  const afterHours = c.after_hours
    ?? "Let the visitor know the team is unavailable right now, but capture their details for a callback first thing.";
  const signOff = c.ai_sign_off ?? "The team will be in touch with you shortly.";
  const hours   = c.working_hours_text ?? "during business hours";

  // Booking close line adapts to the business's preferred booking method
  const bookingClose = c.booking_preference?.toLowerCase().includes("whatsapp")
    ? `"Want the team to WhatsApp you to confirm a time?"`
    : c.booking_preference?.toLowerCase().includes("call")
    ? `"Want the team to call you back to confirm the details?"`
    : `"Want the team to call you back or WhatsApp you to confirm a time?"`;

  const ownerRef = c.owner_name ? ` ${c.owner_name} or` : "";

  const greetingNote = c.ai_greeting
    ? `Opening message template: "${c.ai_greeting}"`
    : `Start with: "Hi, welcome to ${biz}. What's your name and how can I help you today?"`;

  const tradeQ = getTradeQuestion(trade);

  // Minimum job qualifier
  const minJobRule = c.minimum_job
    ? `\nIf a visitor's job is clearly below the minimum job value (${c.minimum_job}), politely let them know and offer to refer them or suggest alternatives. Do not book jobs below the minimum.`
    : "";

  // Free quote rule
  const freeQuoteRule = c.free_quotes
    ? `\nFree quotes: ${c.free_quotes}. Use this to answer "do you charge for a quote?"`
    : "";

  const commonQnA  = c.common_questions  ? `\n\n## COMMON QUESTIONS\n${c.common_questions}`   : "";
  const objections = c.common_objections ? `\n\n## COMMON OBJECTIONS\nHandle each in 1-2 sentences:\n${c.common_objections}` : "";
  const custom     = customSystemPrompt
    ? `\n\n## FULL BUSINESS PROFILE (from setup)\nUse the details below to answer any specific question about this business accurately. This is the ground truth:\n\n${customSystemPrompt}`
    : "";

  return `You are the digital assistant for ${biz}. You are the first and most important point of contact for every visitor on the website. Your one job is to convert every visitor into a confirmed booking or qualified lead.

## BUSINESS KNOWLEDGE — READ FIRST

Everything below is factual information about this business. Use it to answer questions accurately and to tailor every message to what this business actually offers.

${ctxSections.join("\n\n")}

## YOUR ONE JOB

Every conversation must end with one of:
(a) A confirmed booking or appointment time agreed
(b) A callback request confirmed, with the visitor's name AND phone or email saved
(c) A clear agreed next step

Never go back and forth without progress. If a conversation reaches 5 exchanges without contact details captured or a booking confirmed, immediately pivot: "I want to make sure the team can reach you. What's the best number or email for you?"

## CONVERSION ARC

Follow these stages in order, every conversation. Skip ahead if the visitor is clearly already further along.

### Stage 1 — Open

${greetingNote}

Ask for the visitor's first name and what they need in one message. Two questions maximum.

The moment they give their name, IMMEDIATELY call update_visitor with their name. Do not wait. Call it instantly, then continue.

### Stage 2 — Capture Contact

After saving the name, ask for their phone number or email. Natural and low-pressure.

"Thanks [Name]. What's the best number or email to reach you on?"
"What's a good number for you, [Name]? So the team can follow up properly."

Call update_visitor immediately when you have their contact details. If they skip it, move on and try again naturally after Stage 3.

### Stage 3 — Discover the Need

Ask ONE targeted question to understand their exact problem. Never ask two at once.

Default for this trade: "${tradeQ}"

After they answer, acknowledge in ONE sentence. Move to Stage 4 immediately.

### Stage 4 — Present the Solution

Two sentences maximum. Show how ${biz} solves their exact problem using what you know about this business. Focus on the outcome.

Reference the business's experience, certifications, or unique strengths if relevant: ${credentials.length ? credentials[0] : `"${biz} handles this all the time."`}

Two sentences, then move directly to Stage 5.

### Stage 5 — Close (MANDATORY)

Ask for the booking or callback every single time. No exceptions.

"When works for you? We're available ${hours} and can come to you."
"Want to lock in a time? Give me a day that works and we'll confirm."
${bookingClose}

If they hesitate: "No stress. I can have${ownerRef} someone call you back within the hour if that's easier."

If they ask another question: Answer in ONE sentence, then: "Anything else, or shall we lock in a time?"

After they confirm: "${signOff}"

You cannot leave Stage 5 without asking for the booking or callback. This is a hard rule.

## AFTER HOURS

${afterHours}

## MESSAGE RULES

Length: ${styleNote}
Tone: ${toneBase}${toneDetail}
${langNote}

Every single message must end with a question that advances the conversation or a direct CTA. The only exception is the final confirmation after a booking or callback is agreed.

Never repeat a question already answered. Move forward.

## SAVING VISITOR INFO — CRITICAL

Call update_visitor IMMEDIATELY when the visitor gives you their name, phone, or email. Do not wait. Do not batch. One piece of info, one call, right away.

## ESCALATION

${escalation}

When escalating: "Let me get${ownerRef} someone from the ${biz} team to reach out directly. What's the best number or email?" Then call update_visitor.

## UNHAPPY CUSTOMERS

${unhappy}

## HARD RULES
${alwaysDo}${neverSay}${minJobRule}${freeQuoteRule}

Never say: "I'd be happy to", "Certainly!", "Absolutely!", "Great question!", "I understand your concern", "I'm here to help", "How may I assist you today?"

Never use bullet points or numbered lists in your replies to visitors.

Never refer to yourself as ChatGPT, Claude, an AI model, or any underlying technology. If asked: "I'm the digital assistant for ${biz}. Want me to connect you with the team directly?"

Never leave a message without a question or CTA at the end.

NEVER use em dashes (—). Use a comma or full stop instead.${commonQnA}${objections}${custom}`;
}

// ── Tool definition ────────────────────────────────────────
// Called as soon as name is known, then again if phone/email is collected.
const TOOLS: Anthropic.Tool[] = [
  {
    name: "update_visitor",
    description: "Save what you know about this visitor. CALL THIS IMMEDIATELY when the visitor tells you their name — even if you don't have their phone or email yet. Call it again later if you get their phone number or email address.",
    input_schema: {
      type: "object" as const,
      properties: {
        name:  { type: "string", description: "Visitor's first name or full name" },
        phone: { type: "string", description: "Phone or WhatsApp number — only include if provided" },
        email: { type: "string", description: "Email address — only include if provided" },
      },
      required: [],
    },
  },
];

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: {
    client_id?: string;
    message?: string;
    history?: { role: "user" | "assistant"; content: string }[];
    visitor_id?: string;
    page_url?: string;
    conversation_id?: string;
  };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: CORS });
  }

  const { client_id, message, history = [], visitor_id, page_url, conversation_id: existingCid } = body;
  if (!client_id || !message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400, headers: CORS });
  }

  let systemPrompt = QWIKLY_SYSTEM;
  let isTopUp = false;
  let clientAuthUserId: string | null = null;

  if (client_id !== "1") {
    const { data: clientRow } = await supabaseAdmin
      .from("clients")
      .select("system_prompt, business_name, owner_name, trade, phone, address, years_in_business, certifications, brands_used, team_size, services_offered, services_excluded, emergency_response, charge_type, callout_fee, example_prices, minimum_job, free_quotes, payment_methods, payment_terms, working_hours_text, booking_lead_time, booking_preference, response_time, after_hours, unique_selling_point, guarantees, star_rating, review_count, testimonials, common_questions, common_objections, tone, ai_tone, ai_language, ai_response_style, ai_greeting, ai_sign_off, ai_always_do, ai_never_say, ai_unhappy_customer, ai_escalation_triggers, ai_escalation_custom, web_widget_greeting, plan, auth_user_id")
      .eq("id", client_id)
      .maybeSingle();

    clientAuthUserId = clientRow?.auth_user_id ?? null;

    // ── Trial expiry check ─────────────────────────────────────
    if (clientAuthUserId) {
      const { data: sub } = await supabaseAdmin
        .from("subscriptions")
        .select("plan, trial_ends_at")
        .eq("user_id", clientAuthUserId)
        .maybeSingle();
      const trialExpired =
        (sub?.plan === "trial" || !sub) &&
        sub?.trial_ends_at &&
        new Date(sub.trial_ends_at) < new Date();
      if (trialExpired) {
        return NextResponse.json({ error: "trial_expired" }, { status: 403, headers: CORS });
      }
    }

    // Always use the conversion-first builder. Custom system_prompt is layered in as additional instructions.
    systemPrompt = buildClientSystemPrompt(clientRow ?? {}, clientRow?.system_prompt);

    // ── Lead cap check ─────────────────────────────────────────
    const tier = resolvePlan(clientRow?.plan);
    const cap = PLAN_CONFIG[tier].leadLimit;
    if (cap !== null) {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const { count: monthLeads } = await supabaseAdmin
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("client_id", Number(client_id))
        .eq("status", "lead")
        .gte("created_at", startOfMonth);
      const captured = monthLeads ?? 0;
      if (captured >= cap) {
        isTopUp = true;
      }
    }
  }

  // ── Inject KB articles + knowledge_chunks ─────────────────
  const kbParts: string[] = [];

  const { data: kbArticles } = await supabaseAdmin
    .from("kb_articles")
    .select("title, body")
    .eq("client_id", Number(client_id))
    .eq("is_active", true)
    .limit(25);
  if (kbArticles && kbArticles.length > 0) {
    kbParts.push(kbArticles.map((a: { title: string; body: string }) => `Q: ${a.title}\nA: ${a.body}`).join("\n\n"));
  }

  // Also search knowledge_chunks (URL/file/paste ingestions from onboarding)
  if (clientAuthUserId) {
    try {
      const queryEmbedding = await embedText(message);
      const { data: chunks } = await supabaseAdmin.rpc("match_chunks", {
        query_embedding: queryEmbedding,
        match_tenant_id: clientAuthUserId,
        match_count: 5,
        similarity_threshold: 0.3,
      });
      if (chunks && chunks.length > 0) {
        kbParts.push((chunks as { content: string }[]).map((c) => c.content).join("\n\n"));
      }
    } catch (err) {
      console.error("knowledge_chunks search error:", err);
    }
  }

  if (kbParts.length > 0) {
    systemPrompt = systemPrompt + "\n\n## Knowledge Base\n\nUse the following information to answer specific questions accurately. Do not recite it unprompted — only use it when directly relevant to what the visitor asks.\n\n" + kbParts.join("\n\n");
  }

  // ── Get or create conversation ─────────────────────────────
  let convoId: string | null = existingCid ?? null;
  if (!convoId) {
    const { data: newConvo } = await supabaseAdmin
      .from("conversations")
      .insert({
        client_id: Number(client_id),
        customer_phone: visitor_id || "web_visitor",
        customer_name: null,
        channel: "web_chat",
        status: "active",
        visitor_id,
        page_url,
      })
      .select("id")
      .single();
    convoId = newConvo?.id ? String(newConvo.id) : null;
  }

  // ── Save visitor message to log ────────────────────────────
  if (convoId) {
    await supabaseAdmin.from("messages_log").insert({
      conversation_id: convoId,
      role: "customer",
      content: message,
    });
  }

  // ── Call Claude ────────────────────────────────────────────
  const claudeMessages: Anthropic.MessageParam[] = [
    ...history.map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: message },
  ];

  let reply = "Sorry, I ran into a technical issue. Please try again in a moment.";
  let visitorInfo: { name?: string; phone?: string; email?: string } | null = null;

  try {
    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 160,
      system: systemPrompt,
      tools: TOOLS,
      messages: claudeMessages,
    });

    for (const block of response.content) {
      if (block.type === "text") reply = block.text;
      if (block.type === "tool_use" && block.name === "update_visitor") {
        visitorInfo = block.input as { name?: string; phone?: string; email?: string };
      }
    }

    // If a tool was called, get the follow-up text reply
    if (visitorInfo && response.stop_reason === "tool_use") {
      const toolUseBlock = response.content.find((b) => b.type === "tool_use");
      if (toolUseBlock && toolUseBlock.type === "tool_use") {
        const followUp = await anthropic.messages.create({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 120,
          system: systemPrompt,
          messages: [
            ...claudeMessages,
            { role: "assistant", content: response.content },
            {
              role: "user",
              content: [{ type: "tool_result", tool_use_id: toolUseBlock.id, content: "saved" }],
            },
          ],
        });
        const textBlock = followUp.content.find((b) => b.type === "text");
        if (textBlock && textBlock.type === "text") reply = textBlock.text;
      }
    }
  } catch (err) {
    console.error("Claude error:", err);
  }

  // ── Save AI reply to log ───────────────────────────────────
  if (convoId) {
    await supabaseAdmin.from("messages_log").insert({
      conversation_id: convoId,
      role: "assistant",
      content: reply,
    });
    await supabaseAdmin
      .from("conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", convoId);
  }

  // ── Update conversation with visitor info ──────────────────
  const leadCaptured = !!visitorInfo;

  if (leadCaptured && visitorInfo && convoId) {
    const updates: Record<string, string | boolean> = { status: "lead" };
    if (visitorInfo.name)  updates.customer_name  = visitorInfo.name;
    if (visitorInfo.phone) updates.customer_phone = visitorInfo.phone;
    if (visitorInfo.email) updates.customer_email = visitorInfo.email;
    if (isTopUp) updates.is_top_up = true;
    await supabaseAdmin.from("conversations").update(updates).eq("id", convoId);

    if (visitorInfo.email && client_id) {
      enrollLeadInSequences(Number(client_id), visitorInfo.email, visitorInfo.name ?? null, convoId).catch(
        (err) => console.error("[sequences] enroll error", err)
      );
    }
  }

  return NextResponse.json(
    { reply, conversation_id: convoId, lead_captured: leadCaptured },
    { headers: CORS }
  );
}
