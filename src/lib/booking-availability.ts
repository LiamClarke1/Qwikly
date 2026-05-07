import { calendarClient, handleCalendarAuthError } from "@/lib/google-calendar";
import { supabaseAdmin } from "@/lib/supabase-server";

const TZ = "Africa/Johannesburg";
const TZ_OFFSET_MIN = 120;

export type AvailableSlot = {
  start: string;
  end: string;
  label: string;
  short_label: string;
};

export type AvailabilityResult =
  | { ok: true; slots: AvailableSlot[] }
  | { ok: false; reason: "calendar_not_connected" | "calendar_disconnected" | "error"; message?: string };

type Options = {
  durationMin?: number;
  bufferMin?: number;
  workingHoursStart?: number;
  workingHoursEnd?: number;
  weekendHoursStart?: number;
  weekendHoursEnd?: number;
  workingDays?: number[];
  weekendDays?: number[];
  lookaheadDays?: number;
  minLeadHours?: number;
  maxSlots?: number;
  maxPerDay?: number;
  weekendMaxPerDay?: number;
  granularityMin?: number;
};

const DEFAULTS: Required<Options> = {
  durationMin: 15,
  bufferMin: 20,
  workingHoursStart: 9,
  workingHoursEnd: 17,
  weekendHoursStart: 10,
  weekendHoursEnd: 15,
  workingDays: [1, 2, 3, 4, 5, 6, 7],
  weekendDays: [6, 7],
  lookaheadDays: 7,
  minLeadHours: 2,
  maxSlots: 30,
  maxPerDay: 8,
  weekendMaxPerDay: 4,
  granularityMin: 60,
};

function sastWeekday(utc: Date): number {
  const shifted = new Date(utc.getTime() + TZ_OFFSET_MIN * 60_000);
  const dow = shifted.getUTCDay();
  return dow === 0 ? 7 : dow;
}

function sastWallClockToUtc(year: number, month1: number, day: number, hour: number, min: number): Date {
  return new Date(Date.UTC(year, month1 - 1, day, hour, min, 0) - TZ_OFFSET_MIN * 60_000);
}

function sastYMD(utc: Date): { year: number; month1: number; day: number } {
  const shifted = new Date(utc.getTime() + TZ_OFFSET_MIN * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month1: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
  };
}

function sastDayKey(utc: Date): string {
  const y = sastYMD(utc);
  return `${y.year}-${y.month1}-${y.day}`;
}

function formatLabel(utc: Date): string {
  return utc.toLocaleString("en-ZA", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

function formatShortLabel(utc: Date): string {
  return utc.toLocaleString("en-ZA", {
    timeZone: TZ,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export async function getAvailableSlots(
  clientId: string,
  options: Options = {}
): Promise<AvailabilityResult> {
  const opts = { ...DEFAULTS, ...options };
  const db = supabaseAdmin();

  const { data: client } = await db
    .from("clients")
    .select("google_access_token, google_refresh_token, google_calendar_id, google_token_expiry")
    .eq("id", clientId)
    .maybeSingle();

  if (!client?.google_access_token) {
    return { ok: false, reason: "calendar_not_connected" };
  }

  const cal = calendarClient(
    client.google_access_token,
    client.google_refresh_token ?? "",
    client.google_token_expiry,
    clientId
  );
  const calendarId = client.google_calendar_id?.trim() || "primary";

  const now = new Date();
  const windowEnd = new Date(now.getTime() + opts.lookaheadDays * 24 * 60 * 60 * 1000);

  type Busy = { start: Date; end: Date };
  let busy: Busy[] = [];
  try {
    const { data } = await cal.events.list({
      calendarId,
      timeMin: now.toISOString(),
      timeMax: windowEnd.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 250,
    });
    busy = (data.items ?? [])
      .filter((ev) => ev.status !== "cancelled" && (ev.transparency ?? "opaque") === "opaque")
      .map((ev) => ({
        start: new Date(ev.start?.dateTime ?? ev.start?.date ?? 0),
        end: new Date(ev.end?.dateTime ?? ev.end?.date ?? 0),
      }))
      .filter((b) => !isNaN(b.start.getTime()) && !isNaN(b.end.getTime()));
  } catch (err) {
    const wasAuth = await handleCalendarAuthError(err, clientId);
    if (wasAuth) return { ok: false, reason: "calendar_disconnected" };
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[booking-availability] events.list failed", message);
    return { ok: false, reason: "error", message };
  }

  const earliest = new Date(now.getTime() + opts.minLeadHours * 60 * 60 * 1000);
  const slots: AvailableSlot[] = [];
  const perDay = new Map<string, number>();
  const bufferMs = opts.bufferMin * 60_000;

  for (let dayOffset = 0; dayOffset < opts.lookaheadDays && slots.length < opts.maxSlots; dayOffset++) {
    const dayProbe = new Date(now.getTime() + dayOffset * 24 * 60 * 60 * 1000);
    const weekday = sastWeekday(dayProbe);
    if (!opts.workingDays.includes(weekday)) continue;

    const isWeekend = opts.weekendDays.includes(weekday);
    const dayStartHour = isWeekend ? opts.weekendHoursStart : opts.workingHoursStart;
    const dayEndHour = isWeekend ? opts.weekendHoursEnd : opts.workingHoursEnd;
    const dayCap = isWeekend ? opts.weekendMaxPerDay : opts.maxPerDay;

    const ymd = sastYMD(dayProbe);
    const dayKey = `${ymd.year}-${ymd.month1}-${ymd.day}`;

    for (let hour = dayStartHour; hour < dayEndHour; hour++) {
      for (let min = 0; min < 60; min += opts.granularityMin) {
        if ((perDay.get(dayKey) ?? 0) >= dayCap) break;

        const endHourFloat = hour + (min + opts.durationMin) / 60;
        if (endHourFloat > dayEndHour) continue;

        const slotStart = sastWallClockToUtc(ymd.year, ymd.month1, ymd.day, hour, min);
        const slotEnd = new Date(slotStart.getTime() + opts.durationMin * 60_000);
        if (slotStart < earliest) continue;

        const isBusy = busy.some(
          (b) =>
            slotStart < new Date(b.end.getTime() + bufferMs) &&
            slotEnd > new Date(b.start.getTime() - bufferMs)
        );
        if (isBusy) continue;

        slots.push({
          start: slotStart.toISOString(),
          end: slotEnd.toISOString(),
          label: formatLabel(slotStart),
          short_label: formatShortLabel(slotStart),
        });
        perDay.set(dayKey, (perDay.get(dayKey) ?? 0) + 1);

        if (slots.length >= opts.maxSlots) break;
      }
      if ((perDay.get(dayKey) ?? 0) >= dayCap) break;
      if (slots.length >= opts.maxSlots) break;
    }
  }

  return { ok: true, slots };
}

export function isSlotStillFree(
  slotStart: string,
  slotEnd: string,
  busy: Array<{ start: Date; end: Date }>,
  bufferMin = 20
): boolean {
  const start = new Date(slotStart);
  const end = new Date(slotEnd);
  const bufferMs = bufferMin * 60_000;
  return !busy.some(
    (b) => start < new Date(b.end.getTime() + bufferMs) && end > new Date(b.start.getTime() - bufferMs)
  );
}

export { sastDayKey };
