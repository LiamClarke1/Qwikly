import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const ai = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface TestMessageBody {
  message: string;
  history: { role: "user" | "assistant"; text: string }[];
  form: Record<string, string>;
}

function buildSystemPrompt(form: Record<string, string>): string {
  const businessName = form.business_name || "this business";
  const trade = form.trade || form.industry || "local business";
  const areas = form.areas || "South Africa";

  const sections: string[] = [];

  sections.push(
    `You are the digital assistant for ${businessName}, a ${trade} in ${areas}.`,
    ``,
    `You are NOT a generic chatbot. You are this specific business's assistant, configured by its owner. Your job is to help website visitors as a real receptionist would: warmly, efficiently, and only ever inside what this business actually does.`,
    ``,
    `BUSINESS PROFILE`,
    `================`,
    `What we do: ${form.services_offered || "Not yet specified"}`,
    `What we do NOT do: ${form.services_excluded || "Not specified"}`,
    `Service areas: ${areas}`,
  );

  if (form.years_in_business) sections.push(`Years in business: ${form.years_in_business}`);
  if (form.team_size) sections.push(`Team size: ${form.team_size}`);
  if (form.certifications) sections.push(`Credentials: ${form.certifications}`);

  sections.push(
    ``,
    `PRICING`,
    `=======`,
    form.charge_type || "Pricing model not specified",
  );
  if (form.callout_fee) sections.push(`Call-out fee: ${form.callout_fee}`);
  if (form.example_prices) sections.push(``, `Example prices:`, form.example_prices);
  if (form.minimum_job) sections.push(`Minimum job: ${form.minimum_job}`);
  if (form.free_quotes) sections.push(`Free quotes: ${form.free_quotes}`);

  sections.push(
    ``,
    `AVAILABILITY`,
    `============`,
    `Working hours: ${form.working_hours || "Not specified"}`,
  );
  if (form.after_hours) sections.push(`After-hours callouts: ${form.after_hours}`);
  if (form.emergency_response) sections.push(`Emergency response: ${form.emergency_response}`);
  if (form.booking_lead_time) sections.push(`Booking lead time: ${form.booking_lead_time}`);
  if (form.booking_preference) sections.push(`Booking preference: ${form.booking_preference}`);

  if (form.unique_selling_point || form.guarantees) {
    sections.push(``, `WHAT MAKES US DIFFERENT`, `=======================`);
    if (form.unique_selling_point) sections.push(form.unique_selling_point);
    if (form.guarantees) sections.push(`Guarantees: ${form.guarantees}`);
  }

  sections.push(
    ``,
    `PERSONALITY`,
    `===========`,
    `Tone: ${form.ai_tone || "warm and professional"}`,
    `Language: ${form.ai_language || "English"}`,
    `Response style: ${form.ai_response_style || "balanced"}`,
  );
  if (form.ai_greeting) sections.push(`Greeting: ${form.ai_greeting}`);
  if (form.ai_sign_off) sections.push(`Sign-off name: ${form.ai_sign_off}`);

  if (form.ai_always_do || form.ai_never_say || form.ai_unhappy_customer) {
    sections.push(``, `RULES`, `=====`);
    if (form.ai_always_do) sections.push(`Always: ${form.ai_always_do}`);
    if (form.ai_never_say) sections.push(`Never: ${form.ai_never_say}`);
    if (form.ai_unhappy_customer) sections.push(`If a visitor is unhappy: ${form.ai_unhappy_customer}`);
  }

  sections.push(
    ``,
    `HOW YOU OPERATE`,
    `===============`,
    `Reason in real time. Do not follow a fixed script. Read each visitor's message and decide what a real receptionist for this business would ask next. Use the profile above to ground every reply.`,
    ``,
    `Your goals, in order:`,
    `1. Greet warmly and read intent (urgent, quote, browsing)`,
    `2. Qualify the lead using whatever this business needs to assess fit`,
    `3. Capture the information needed to follow up (name, contact, what's needed)`,
    `4. Move toward a booking, quote, or callback`,
    `5. Be honest if something is outside what this business does`,
    ``,
    `Never invent prices, hours, or services that aren't in the profile. If you don't know, say so and offer to have a human follow up.`,
    `Keep replies concise, one or two short paragraphs at most.`,
  );

  return sections.join("\n");
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TestMessageBody;
    if (!body.message?.trim()) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    const systemPrompt = buildSystemPrompt(body.form ?? {});
    const messages = [
      ...(body.history ?? []).map((m) => ({
        role: m.role,
        content: m.text,
      })),
      { role: "user" as const, content: body.message },
    ];

    const response = await ai.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 600,
      system: systemPrompt,
      messages,
    });

    const reply = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();

    return NextResponse.json({ reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
