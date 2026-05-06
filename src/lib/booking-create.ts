import { calendarClient, handleCalendarAuthError } from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase-server";
import {
  resend,
  FROM,
  qwiklyMeetingConfirmationHtml,
  qwiklyBookingNotificationHtml,
} from "@/lib/resend";
import { resolveQwiklyOwnRecipientOverride } from "@/lib/notify-lead";

export type BookingResult =
  | {
      ok: true;
      eventId: string;
      meetLink: string | null;
      eventLink: string | null;
      start: string;
      end: string;
      label: string;
    }
  | { ok: false; reason: "calendar_not_connected" | "calendar_disconnected" | "slot_taken" | "error"; message?: string };

type BookMeetingArgs = {
  clientId: string;
  visitorName: string;
  visitorEmail: string;
  visitorPhone?: string | null;
  businessType?: string | null;
  start: string;
  end: string;
  notes?: string | null;
  conversationId?: string | null;
};

async function resolveBookingNotificationRecipient(clientId: string): Promise<string | null> {
  const override = resolveQwiklyOwnRecipientOverride(clientId);
  if (override) return override;

  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("auth_user_id")
    .eq("id", clientId)
    .maybeSingle();
  const authUserId = (client as { auth_user_id?: string | null } | null)?.auth_user_id;
  if (!authUserId) return null;

  const { data: business } = await db
    .from("businesses")
    .select("notification_email, contact_email")
    .eq("user_id", authUserId)
    .maybeSingle();
  const b = (business as { notification_email?: string | null; contact_email?: string | null } | null) ?? null;
  return (b?.notification_email && b.notification_email.trim())
    || (b?.contact_email && b.contact_email.trim())
    || null;
}

function formatLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export async function bookMeeting(args: BookMeetingArgs): Promise<BookingResult> {
  const db = supabaseAdmin();
  const { data: client } = await db
    .from("clients")
    .select("google_access_token, google_refresh_token, google_calendar_id, google_token_expiry")
    .eq("id", args.clientId)
    .maybeSingle();

  if (!client?.google_access_token) {
    return { ok: false, reason: "calendar_not_connected" };
  }

  try {
    const cal = calendarClient(
      client.google_access_token,
      client.google_refresh_token ?? "",
      client.google_token_expiry,
      args.clientId
    );
    const calendarId = client.google_calendar_id ?? "primary";

    // Re-check the slot is still free right before booking. Cheap protection
    // against two visitors agreeing to the same slot inside the same minute.
    const { data: collisions } = await cal.events.list({
      calendarId,
      timeMin: args.start,
      timeMax: args.end,
      singleEvents: true,
      maxResults: 5,
    });
    const blocking = (collisions.items ?? []).filter(
      (ev) => ev.status !== "cancelled" && (ev.transparency ?? "opaque") === "opaque"
    );
    if (blocking.length > 0) {
      return { ok: false, reason: "slot_taken" };
    }

    const requestId = `qwikly-${args.clientId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const description = [
      `Qwikly intro call with ${args.visitorName}.`,
      args.businessType ? `Business: ${args.businessType}` : null,
      `Email: ${args.visitorEmail}`,
      args.visitorPhone ? `Phone: ${args.visitorPhone}` : null,
      args.notes ? `\nNotes: ${args.notes}` : null,
      `\nBooked via the Qwikly website chat.`,
    ]
      .filter(Boolean)
      .join("\n");

    const { data: event } = await cal.events.insert({
      calendarId,
      conferenceDataVersion: 1,
      sendUpdates: "all",
      requestBody: {
        summary: `Qwikly intro — ${args.visitorName}${args.businessType ? ` (${args.businessType})` : ""}`,
        description,
        start: { dateTime: args.start, timeZone: "Africa/Johannesburg" },
        end: { dateTime: args.end, timeZone: "Africa/Johannesburg" },
        attendees: [{ email: args.visitorEmail, displayName: args.visitorName }],
        conferenceData: {
          createRequest: {
            requestId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        reminders: { useDefault: true },
      },
    });

    const meetLink =
      event.hangoutLink ??
      event.conferenceData?.entryPoints?.find((e) => e.entryPointType === "video")?.uri ??
      null;

    try {
      await resend.emails.send({
        from: FROM,
        to: args.visitorEmail,
        subject: `Your Qwikly call is booked — ${formatLabel(args.start)}`,
        html: qwiklyMeetingConfirmationHtml({
          visitorName: args.visitorName,
          startIso: args.start,
          endIso: args.end,
          meetLink,
        }),
      });
    } catch (mailErr) {
      console.error("[booking-create] visitor confirmation email failed", mailErr);
    }

    // Notify the host (Liam / Clarke Agency inbox) that a booking just landed.
    // Best-effort, never block the booking response on email delivery.
    const hostRecipient = await resolveBookingNotificationRecipient(args.clientId);
    if (hostRecipient) {
      const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";
      const conversationUrl = args.conversationId
        ? `${baseUrl}/dashboard/conversations/${args.conversationId}`
        : null;
      try {
        await resend.emails.send({
          from: FROM,
          to: hostRecipient,
          replyTo: args.visitorEmail,
          subject: `New Qwikly booking — ${args.visitorName} @ ${formatLabel(args.start)}`,
          html: qwiklyBookingNotificationHtml({
            visitorName: args.visitorName,
            visitorEmail: args.visitorEmail,
            visitorPhone: args.visitorPhone ?? null,
            businessType: args.businessType ?? null,
            startIso: args.start,
            endIso: args.end,
            meetLink,
            notes: args.notes ?? null,
            conversationUrl,
          }),
        });
      } catch (mailErr) {
        console.error("[booking-create] host notification email failed", mailErr);
      }
    }

    return {
      ok: true,
      eventId: event.id ?? "",
      meetLink,
      eventLink: event.htmlLink ?? null,
      start: args.start,
      end: args.end,
      label: formatLabel(args.start),
    };
  } catch (err: unknown) {
    const wasAuth = await handleCalendarAuthError(err, args.clientId);
    if (wasAuth) return { ok: false, reason: "calendar_disconnected" };
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[booking-create] failed", message);
    return { ok: false, reason: "error", message };
  }
}
