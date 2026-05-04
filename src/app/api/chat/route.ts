export const runtime = "nodejs";
export const maxDuration = 30;

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseAdmin as createSupabaseAdmin } from "@/lib/supabase-server";
import { ensureKbEmbeddings, searchKb, embedText } from "@/lib/embeddings";
import { enrollLeadInSequences } from "@/lib/email/sequences";
import { resolvePlan, PLAN_CONFIG } from "@/lib/plan";
import {
  buildClientSystemPrompt,
  CLIENT_TOOLS,
  type ClientPromptData,
  type VisitorToolInput,
} from "@/lib/assistant-prompt";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export async function OPTIONS() {
  return new NextResponse(null, { headers: CORS });
}

export async function POST(req: NextRequest) {
  let body: {
    tenantId?: string;
    sessionId?: string;
    message?: string;
    context?: { pageUrl?: string };
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400, headers: CORS });
  }

  const { tenantId, sessionId, message, context } = body;
  if (!tenantId || !message) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400, headers: CORS });
  }

  const db = createSupabaseAdmin();

  // Resolve public_key → client with all fields needed by buildClientSystemPrompt
  const { data: client } = await db
    .from("clients")
    .select(`
      id, web_widget_enabled, auth_user_id, plan, system_prompt,
      business_name, owner_name, trade, phone, address,
      years_in_business, certifications, brands_used, team_size,
      services_offered, services_excluded, emergency_response,
      charge_type, callout_fee, example_prices, minimum_job, free_quotes,
      payment_methods, payment_terms, working_hours_text, booking_lead_time,
      booking_preference, response_time, after_hours,
      unique_selling_point, guarantees, star_rating, review_count, testimonials,
      common_questions, common_objections, faq,
      tone, ai_tone, ai_language, ai_response_style, ai_greeting, ai_sign_off,
      ai_always_do, ai_never_say, ai_unhappy_customer,
      ai_escalation_triggers, ai_escalation_custom
    `)
    .eq("public_key", tenantId)
    .maybeSingle();

  if (!client || !client.web_widget_enabled) {
    const enc = new TextEncoder();
    const err = new ReadableStream({
      start(c) {
        c.enqueue(enc.encode(`data: ${JSON.stringify({ error: "unauthorized" })}\n\n`));
        c.enqueue(enc.encode("data: [DONE]\n\n"));
        c.close();
      },
    });
    return new Response(err, { status: 403, headers: { "Content-Type": "text/event-stream", ...CORS } });
  }

  // Trial expiry check
  if (client.auth_user_id) {
    const { data: sub } = await db
      .from("subscriptions")
      .select("plan, trial_ends_at")
      .eq("user_id", client.auth_user_id)
      .maybeSingle();

    const trialExpired =
      (sub?.plan === "trial" || !sub) &&
      sub?.trial_ends_at &&
      new Date(sub.trial_ends_at) < new Date();

    if (trialExpired) {
      const enc = new TextEncoder();
      const err = new ReadableStream({
        start(c) {
          c.enqueue(enc.encode(`data: ${JSON.stringify({ error: "trial_expired" })}\n\n`));
          c.enqueue(enc.encode("data: [DONE]\n\n"));
          c.close();
        },
      });
      return new Response(err, { status: 403, headers: { "Content-Type": "text/event-stream", ...CORS } });
    }
  }

  // Monthly lead cap check
  let isTopUp = false;
  const tier = resolvePlan(client.plan);
  const cap = PLAN_CONFIG[tier].leadLimit;
  if (cap !== null) {
    const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
    const { count: monthLeads } = await db
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("client_id", client.id)
      .eq("is_lead", true)
      .gte("created_at", startOfMonth);
    if ((monthLeads ?? 0) >= cap) {
      isTopUp = true;
    }
  }

  // Build fully personalized system prompt
  const baseSystemPrompt = buildClientSystemPrompt(client as ClientPromptData, client.system_prompt);

  // Lazy embed any un-embedded KB articles for this tenant
  try {
    await ensureKbEmbeddings(db, client.id);
  } catch (err) {
    console.error("ensureKbEmbeddings error:", err);
  }

  // RAG: semantic search through kb_articles + knowledge_chunks
  const kbParts: string[] = [];

  try {
    const articles = await searchKb(db, client.id, message);
    if (articles.length > 0) {
      kbParts.push(articles.map((a) => `Q: ${a.title}\nA: ${a.body}`).join("\n\n"));
    }
  } catch (err) {
    console.error("searchKb error:", err);
  }

  if (client.auth_user_id) {
    try {
      const queryEmbedding = await embedText(message);
      const { data: chunks } = await db.rpc("match_chunks", {
        query_embedding: queryEmbedding,
        match_tenant_id: client.auth_user_id,
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

  const systemPrompt = kbParts.length > 0
    ? baseSystemPrompt + "\n\n## Knowledge Base\n\nUse the following information to answer specific questions accurately. Do not recite it unprompted — only use it when directly relevant to what the visitor asks.\n\n" + kbParts.join("\n\n")
    : baseSystemPrompt;

  const validSessionId = sessionId && sessionId.trim() ? sessionId.trim() : null;

  // Get or create conversation
  let convoId: string | null = null;
  if (validSessionId) {
    const { data: existing } = await db
      .from("conversations")
      .select("id")
      .eq("visitor_id", validSessionId)
      .eq("client_id", client.id)
      .eq("channel", "web_chat")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    convoId = existing?.id ? String(existing.id) : null;
  }

  if (!convoId) {
    const { data: newConvo } = await db
      .from("conversations")
      .insert({
        client_id: client.id,
        customer_phone: validSessionId ?? "web_visitor",
        channel: "web_chat",
        status: "active",
        visitor_id: validSessionId,
        page_url: context?.pageUrl ?? null,
      })
      .select("id")
      .single();
    convoId = newConvo?.id ? String(newConvo.id) : null;
  }

  // Load recent history BEFORE saving current message
  const { data: historyRows } = convoId
    ? await db
        .from("messages_log")
        .select("role, content")
        .eq("conversation_id", convoId)
        .order("created_at", { ascending: true })
        .limit(20)
    : { data: [] };

  // Save visitor message
  if (convoId) {
    await db.from("messages_log").insert({
      conversation_id: convoId,
      role: "customer",
      content: message,
    });
  }

  // Build Anthropic messages from history + current
  const claudeMessages: Anthropic.MessageParam[] = (historyRows ?? []).map((r) => ({
    role: r.role === "assistant" ? ("assistant" as const) : ("user" as const),
    content: r.content,
  }));
  claudeMessages.push({ role: "user", content: message });

  const encoder = new TextEncoder();
  const readable = new ReadableStream({
    async start(controller) {
      let fullReply = "";
      let visitorInfo: VisitorToolInput | null = null;

      try {
        // Phase 1: stream (may include a tool_use block before or instead of text)
        const stream1 = anthropic.messages.stream({
          model: "claude-haiku-4-5-20251001",
          max_tokens: 600,
          system: systemPrompt,
          tools: CLIENT_TOOLS,
          messages: claudeMessages,
        });

        for await (const event of stream1) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            const delta = event.delta.text;
            fullReply += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
          }
        }

        const finalMsg1 = await stream1.finalMessage();

        // Extract tool call if present
        let toolUseBlock: Anthropic.ToolUseBlock | null = null;
        for (const block of finalMsg1.content) {
          if (block.type === "tool_use" && block.name === "update_visitor") {
            visitorInfo = block.input as VisitorToolInput;
            toolUseBlock = block;
          }
        }

        // Phase 2: if tool was called, stream the follow-up reply
        if (toolUseBlock && finalMsg1.stop_reason === "tool_use") {
          const stream2 = anthropic.messages.stream({
            model: "claude-haiku-4-5-20251001",
            max_tokens: 600,
            system: systemPrompt,
            tools: CLIENT_TOOLS,
            messages: [
              ...claudeMessages,
              { role: "assistant", content: finalMsg1.content },
              {
                role: "user",
                content: [{ type: "tool_result", tool_use_id: toolUseBlock.id, content: "saved" }],
              },
            ],
          });

          fullReply = ""; // Phase 2 is the real conversational reply
          for await (const event of stream2) {
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta"
            ) {
              const delta = event.delta.text;
              fullReply += delta;
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`));
            }
          }
        }
      } catch (err) {
        console.error("Chat stream error:", err);
        const fallback = "Something went wrong. Please try again.";
        fullReply = fallback;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta: fallback })}\n\n`));
      } finally {
        try {
          if (convoId && fullReply) {
            await db.from("messages_log").insert({
              conversation_id: convoId,
              role: "assistant",
              content: fullReply,
            });

            // Lead capture: tool-based, no pattern matching
            const hasContact = !!(visitorInfo?.phone || visitorInfo?.email);

            if (visitorInfo && hasContact) {
              // Real lead: contact info captured, count against monthly cap
              const updates: Record<string, string | boolean> = {
                status: "lead",
                is_lead: true,
                updated_at: new Date().toISOString(),
              };
              if (visitorInfo.name)           updates.customer_name  = visitorInfo.name;
              if (visitorInfo.phone)          updates.customer_phone = visitorInfo.phone;
              if (visitorInfo.email)          updates.customer_email = visitorInfo.email;
              if (visitorInfo.booking_intent) updates.booking_intent = true;
              if (isTopUp)                    updates.is_top_up      = true;
              await db.from("conversations").update(updates).eq("id", convoId);

              if (visitorInfo.email) {
                enrollLeadInSequences(client.id, visitorInfo.email, visitorInfo.name ?? null, convoId).catch(
                  (err) => console.error("[sequences] enroll error", err)
                );
              }
            } else if (visitorInfo) {
              // Name-only or booking_intent without contact — save but don't count as lead
              const nameFields: Record<string, string | boolean> = {};
              if (visitorInfo.name)           nameFields.customer_name = visitorInfo.name;
              if (visitorInfo.booking_intent) nameFields.booking_intent = true;
              if (Object.keys(nameFields).length > 0) {
                await db.from("conversations").update({
                  ...nameFields,
                  updated_at: new Date().toISOString(),
                }).eq("id", convoId);
              } else {
                await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);
              }
            } else {
              await db.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", convoId);
            }
          }
        } catch (persistErr) {
          console.error("Persist error:", persistErr);
        }

        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ conversation_id: convoId })}\n\n`));
        controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "X-Accel-Buffering": "no",
      ...CORS,
    },
  });
}
