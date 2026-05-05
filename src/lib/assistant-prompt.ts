import Anthropic from "@anthropic-ai/sdk";

export type VisitorToolInput = {
  name?: string;
  phone?: string;
  email?: string;
  booking_intent?: boolean;
  job_type?: string;
  area?: string;
  preferred_time?: string;
};

export type ClientPromptData = {
  business_name?: string | null;
  owner_name?: string | null;
  faq?: { q: string; a: string }[] | null;
  trade?: string | null;
  address?: string | null;
  phone?: string | null;
  years_in_business?: string | null;
  certifications?: string | null;
  brands_used?: string | null;
  team_size?: string | null;
  services_offered?: string | null;
  services_excluded?: string | null;
  charge_type?: string | null;
  callout_fee?: string | null;
  example_prices?: string | null;
  minimum_job?: string | null;
  free_quotes?: string | null;
  payment_methods?: string | null;
  payment_terms?: string | null;
  working_hours_text?: string | null;
  booking_lead_time?: string | null;
  booking_preference?: string | null;
  response_time?: string | null;
  after_hours?: string | null;
  emergency_response?: string | null;
  unique_selling_point?: string | null;
  guarantees?: string | null;
  star_rating?: string | null;
  review_count?: string | null;
  testimonials?: string | null;
  common_questions?: string | null;
  common_objections?: string | null;
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

export const CLIENT_TONE_MAP: Record<string, string> = {
  friendly:            "Warm and conversational. Use contractions, match their energy. Friendly without being over-the-top.",
  friendly_casual:     "Warm and conversational. Use contractions, match their energy. Friendly without being over-the-top.",
  professional:        "Precise and professional. Complete sentences, respectful throughout.",
  professional_formal: "Precise and professional. Complete sentences, respectful throughout.",
  brief:               "Direct and efficient. Shortest path to the answer or booking. No small talk.",
  direct_efficient:    "Direct and efficient. Shortest path to the answer or booking. No small talk.",
  warm:                "Caring and empathetic. Acknowledge the visitor's situation before offering solutions.",
  warm_empathetic:     "Caring and empathetic. Acknowledge the visitor's situation before offering solutions.",
};

export const SETUP_TONE_KEYS = new Set(["friendly_casual","professional_formal","warm_empathetic","direct_efficient"]);

export const RESPONSE_STYLE_MAP: Record<string, string> = {
  short:          "1-2 sentences per message maximum. Punchy and direct.",
  brief:          "1-2 sentences per message maximum. Punchy and direct.",
  detailed:       "2-3 sentences per message. Enough context to build confidence, never full paragraphs.",
  balanced:       "2-3 sentences per message. Helpful detail without overwhelming.",
  conversational: "2-3 natural sentences. Like a real person talking.",
};

export function getTradeQuestion(trade: string): string {
  const t = (trade ?? "").toLowerCase();
  if (t.includes("plumb"))                                               return "What's the issue, is it a leak, a blocked drain, or something else?";
  if (t.includes("electr"))                                              return "What's the fault, a trip, wiring issue, or something else?";
  if (t.includes("clean"))                                               return "What type of clean do you need, regular, once-off, or a deep clean?";
  if (t.includes("dental") || t.includes("dentist"))                    return "Is this for a routine check-up or do you have a specific concern?";
  if (t.includes("doctor") || t.includes("medical") || t.includes("gp")) return "Is this for a new appointment or a follow-up?";
  if (t.includes("pest"))                                                return "What type of pest are you dealing with and where on the property?";
  if (t.includes("garden") || t.includes("landscap"))                   return "What do you need done, regular maintenance, a once-off tidy, or a full project?";
  if (t.includes("paint"))                                               return "Is this interior, exterior, or both, and roughly how big is the space?";
  if (t.includes("tile") || t.includes("floor"))                        return "Is this a new installation or a repair, and what type of surface?";
  if (t.includes("pool"))                                                return "Is it a maintenance issue, a repair, or are you looking to install?";
  if (t.includes("air") || t.includes("hvac") || t.includes("condition")) return "Is the unit not cooling, making a noise, or do you need a service?";
  if (t.includes("build") || t.includes("construct") || t.includes("renovat")) return "What's the project, a renovation, new build, or a repair?";
  if (t.includes("legal") || t.includes("law") || t.includes("attorney")) return "What type of matter do you need help with?";
  if (t.includes("account") || t.includes("tax") || t.includes("bookkeep")) return "Is this for tax returns, monthly bookkeeping, or something specific?";
  if (t.includes("salon") || t.includes("hair") || t.includes("beauty") || t.includes("nail")) return "What treatment are you looking to book?";
  if (t.includes("gym") || t.includes("fitness") || t.includes("personal train")) return "Are you looking for personal training, a membership, or a specific class?";
  if (t.includes("restaurant") || t.includes("cafe") || t.includes("cater")) return "Is this for a table booking or a catering enquiry?";
  if (t.includes("photog"))                                              return "What type of shoot are you after, portrait, event, commercial, or something else?";
  if (t.includes("security") || t.includes("alarm"))                    return "Is this for a new installation, a repair, or a monitoring enquiry?";
  if (t.includes("move") || t.includes("removal"))                      return "Is this a local move or long distance, and roughly how big is the load?";
  return "Tell me a bit more about what you need so I can point you in the right direction.";
}

export function buildClientSystemPrompt(c: ClientPromptData, customSystemPrompt?: string | null): string {
  // If the client has written a custom system_prompt, use it as a full override.
  // They take complete responsibility for the prompt; the generated template below is skipped.
  if (customSystemPrompt?.trim()) {
    return customSystemPrompt.trim();
  }

  const biz   = c.business_name ?? "this business";
  const trade = c.trade ?? "service business";

  const toneBase   = CLIENT_TONE_MAP[c.tone ?? ""] || CLIENT_TONE_MAP[c.ai_tone ?? ""] || CLIENT_TONE_MAP.friendly;
  const toneDetail = (c.ai_tone && !SETUP_TONE_KEYS.has(c.ai_tone)) ? ` ${c.ai_tone}.` : "";
  const styleNote  = RESPONSE_STYLE_MAP[c.ai_response_style ?? ""] ?? RESPONSE_STYLE_MAP.conversational;
  const langNote   = c.ai_language ? `Communicate in ${c.ai_language}.` : "";

  const identity: string[] = [];
  if (c.owner_name)        identity.push(`Owner / contact: ${c.owner_name}`);
  if (c.years_in_business) identity.push(`Years in business: ${c.years_in_business}`);
  if (c.team_size)         identity.push(`Team size: ${c.team_size}`);
  if (c.address)           identity.push(`Service area / location: ${c.address}`);
  if (c.phone)             identity.push(`Business phone: ${c.phone}`);

  const credentials: string[] = [];
  if (c.certifications) credentials.push(`Certifications: ${c.certifications}`);
  if (c.brands_used)    credentials.push(`Brands / products used: ${c.brands_used}`);

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
  if (c.working_hours_text) availability.push(`Working hours: ${c.working_hours_text}`);
  if (c.booking_lead_time)  availability.push(`Booking lead time: ${c.booking_lead_time}`);
  if (c.booking_preference) availability.push(`Preferred booking method: ${c.booking_preference}`);
  if (c.response_time)      availability.push(`Response time: ${c.response_time}`);
  if (c.emergency_response) availability.push(`Emergency response: ${c.emergency_response}`);

  const trust: string[] = [];
  if (c.unique_selling_point)          trust.push(`What makes us different: ${c.unique_selling_point}`);
  if (c.guarantees)                    trust.push(`Guarantees: ${c.guarantees}`);
  if (c.star_rating && c.review_count) trust.push(`Ratings: ${c.star_rating}★ from ${c.review_count} reviews`);
  else if (c.star_rating)              trust.push(`Star rating: ${c.star_rating}★`);
  if (c.testimonials)                  trust.push(`Customer testimonials:\n${c.testimonials}`);

  const ctxSections = [
    identity.length    ? identity.join("\n")    : `Trade: ${trade}`,
    credentials.length ? credentials.join("\n") : "",
    services.length    ? services.join("\n\n")  : "",
    pricing.length     ? pricing.join("\n")     : "",
    availability.length? availability.join("\n"): "",
    trust.length       ? trust.join("\n")       : "",
  ].filter(Boolean);

  let escalation: string;
  const trig = c.ai_escalation_triggers;
  if (trig === "custom" && c.ai_escalation_custom) {
    // Client wrote their own escalation rules — use them exclusively.
    escalation = c.ai_escalation_custom;
  } else {
    const parts: string[] = [];
    if (trig === "angry"   || trig === "all") parts.push("visitor is clearly angry or distressed");
    if (trig === "complex" || trig === "all") parts.push("question is outside your knowledge");
    if (trig === "price"   || trig === "all") parts.push("visitor wants detailed pricing negotiation");
    escalation = parts.length
      ? `Escalate when the ${parts.join(", or ")}.`
      : "Escalate when you cannot answer accurately. Offer to have a team member call the visitor back.";
    // Append any extra custom instructions alongside the preset trigger.
    if (c.ai_escalation_custom) escalation += ` ${c.ai_escalation_custom}`;
  }

  const unhappy = c.ai_unhappy_customer
    ?? "Stay calm. Acknowledge their frustration in one sentence, then offer to have a real person call them back. Capture their number before the conversation ends.";

  const alwaysDo  = c.ai_always_do ? `\nAlways do:\n${c.ai_always_do}` : "";
  const neverSay  = c.ai_never_say ? `\nNever say:\n${c.ai_never_say}` : "";
  // Use || so an empty string saved to the DB still falls back to the default.
  const afterHours = c.after_hours?.trim() ||
    "Let the visitor know the team is unavailable right now, but capture their details for a callback first thing.";
  const signOff = c.ai_sign_off?.trim() || "The team will be in touch with you shortly.";
  const hours    = c.working_hours_text ?? "during business hours";

  const bookingClose = c.booking_preference?.toLowerCase().includes("whatsapp")
    ? `"Want the team to WhatsApp you to confirm a time?"`
    : c.booking_preference?.toLowerCase().includes("call")
    ? `"Want the team to call you back to confirm the details?"`
    : `"Want the team to call you back or WhatsApp you to confirm a time?"`;

  const ownerRef     = c.owner_name ? ` ${c.owner_name} or` : "";
  const greetingNote = c.ai_greeting
    ? `Opening message template: "${c.ai_greeting}"`
    : `Start with: "Hi, welcome to ${biz}. What's your name and how can I help you today?"`;
  const tradeQ = getTradeQuestion(trade);

  const minJobRule = c.minimum_job
    ? `\nIf a visitor's job is clearly below the minimum job value (${c.minimum_job}), politely let them know and offer to refer them or suggest alternatives. Do not book jobs below the minimum.`
    : "";
  const freeQuoteRule = c.free_quotes
    ? `\nFree quotes: ${c.free_quotes}. Use this to answer "do you charge for a quote?"`
    : "";

  const faqBlock   = (c.faq && c.faq.length > 0)
    ? `\n\n## FAQ — EXACT ANSWERS TO GIVE\nWhen a visitor asks any of these questions, use the exact answer provided:\n\n` +
      c.faq.map((item) => `Q: ${item.q}\nA: ${item.a}`).join("\n\n")
    : "";
  const commonQnA  = c.common_questions  ? `\n\n## COMMON QUESTIONS\n${c.common_questions}`                             : "";
  const objections = c.common_objections ? `\n\n## COMMON OBJECTIONS\nHandle each in 1-2 sentences:\n${c.common_objections}` : "";

  return `You are the digital assistant for ${biz}. You are the first and most important point of contact for every visitor on the website. Your one job is to convert every visitor into a confirmed booking or qualified lead.

## BUSINESS KNOWLEDGE — READ FIRST

Everything below is factual information about this business. Use it to answer questions accurately and to tailor every message to what this business actually offers.

${ctxSections.join("\n\n")}

## YOUR ONE JOB

Every conversation must end with:
(a) A confirmed booking or appointment time agreed
(b) A callback request confirmed, with the visitor's name AND phone or email saved
(c) A clear agreed next step

Never go back and forth without progress. If a conversation reaches 4 exchanges with no progress toward a booking, pivot and ask for their contact details directly.

## CONTACT DETAILS

Do NOT ask for email or phone immediately after getting the visitor's name. Warm them up through discovery first. Contact is collected in Stage 5 before the close. This is the rule.

You must still collect contact details before the conversation ends. If you reach Stage 5 without contact details, ask before giving any booking or sending the visitor anywhere.

## CONVERSION ARC

Follow these stages in order. Skip ahead if the visitor is already further along.

### Stage 1 — Open

${greetingNote}

Ask for the visitor's first name and what they need in ONE message. Two questions maximum.

Generate the opener fresh every conversation. Read the tone and energy of what they wrote and match it exactly. A casual "hi" gets a casual, direct response. A detailed question gets a brief answer then the name ask. A sceptical message gets a no-nonsense opener. Never sound like you're reading from a script, never repeat the same opener twice.

The moment they give their name, IMMEDIATELY call update_visitor. Do not wait. Then use their name naturally through the rest of the conversation, once every few messages, not every line.

Do NOT ask for email or phone yet. That comes in Stage 5. First, warm them up.

### Stage 2 — Discover the Need

Ask ONE targeted question to understand their exact problem. Never ask two at once. Choose based on what they've told you and what you know about this trade.

Default for this trade: "${tradeQ}"

Think about urgency, scale, history, the specific nature of the problem, and location. Draw on your understanding of how people in this trade experience problems. Generate the question from the context of this conversation, not from a fixed list. The question should feel like it came from someone who has dealt with this kind of job many times before.

After they answer, acknowledge in ONE sentence that validates what they said. Then move to Stage 3.

### Stage 3 — Qualify and Quantify

Ask one more question to understand the severity or scope. One question only.

Think about impact on their daily life, safety, cost of leaving it unfixed, timeline, or budget. Use whichever angle is most relevant to what they've told you. Generate the question from context.

After they answer, acknowledge and move directly to Stage 4.

### Stage 4 — Present the Solution

Two sentences maximum. Show how ${biz} solves their exact problem. Focus on the outcome. Use what you know about this business, their credentials, their speed, their specialisation.

${credentials.length ? `Relevant strengths to reference: ${credentials[0]}` : ""}

Vary the framing every conversation. Sometimes lead with speed, sometimes expertise, sometimes peace of mind, sometimes outcome, sometimes reassurance. Never repeat the same version twice. Two sentences, then move directly to Stage 5.

### Stage 5 — Close (MANDATORY)

CONTACT GATE: If you do not yet have the visitor's phone number or email, ask for it before anything else. Make it feel like the natural next step, not a form. Generate the ask from context.

Call update_visitor immediately once they give it. If they decline a second time, proceed without it.

Once you have contact details (or they've declined twice), close the booking. Read how they're responding and adapt:

If they seem ready: ask when works for them, reference available hours (${hours}). ${bookingClose}

If they seem hesitant: ask what's holding them back. Remove the obstacle. Don't push, just remove friction.

If they're price sensitive: offer a quote first, no obligation. Be upfront that there are no surprises.

If they need time: give them space, confirm when they think they'll be ready.

If they hesitate: "No stress. I can have${ownerRef} someone call you back within the hour if that's easier."

If they ask another question: Answer in ONE sentence, then: "Anything else, or shall we lock in a time?"

After they confirm: "${signOff}"

You cannot leave Stage 5 without asking for the booking or callback. Hard rule.

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

Set booking_intent: true when the visitor confirms a callback, agrees on a booking time, or asks to be contacted by the team. Do not set it for general questions. Only set it when they have committed to a concrete next step that requires the business to follow up.

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

NEVER use em dashes (—). Use a comma or full stop instead.${faqBlock}${commonQnA}${objections}`;
}

export const CLIENT_TOOLS: Anthropic.Tool[] = [
  {
    name: "update_visitor",
    description: "Save what you know about this visitor. CALL THIS IMMEDIATELY when the visitor tells you their name — even if you don't have their phone or email yet. Call it again when you get their phone number, email address, or when they commit to a callback or booking. Also save job_type, area, and preferred_time as you learn them.",
    input_schema: {
      type: "object" as const,
      properties: {
        name:           { type: "string",  description: "Visitor's first name or full name" },
        phone:          { type: "string",  description: "Phone or WhatsApp number — only include if provided" },
        email:          { type: "string",  description: "Email address — only include if provided" },
        booking_intent: { type: "boolean", description: "Set to true when the visitor confirms a callback, agrees on a booking time, or asks to be contacted by the team. Only set for firm commitments, not general questions." },
        job_type:       { type: "string",  description: "What type of service or job the visitor needs, e.g. 'leak repair', 'deep clean', 'electrical fault'" },
        area:           { type: "string",  description: "The area, suburb, or location the visitor mentioned" },
        preferred_time: { type: "string",  description: "When the visitor prefers to be contacted or when they are available, e.g. 'mornings', 'this weekend', 'after 5pm'" },
      },
      required: [],
    },
  },
];
