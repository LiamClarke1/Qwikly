import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyBookingToken } from "@/lib/booking-link";
import { bookMeeting } from "@/lib/booking-create";

// T3.9 — sourced from QWIKLY_OWNER_CLIENT_ID env var (see .env.example).
// Falls back to "1" so local dev without the env var still works.
const QWIKLY_OWN_CLIENT_ID = process.env.QWIKLY_OWNER_CLIENT_ID ?? "1";

export const dynamic = "force-dynamic";

async function confirmBookingAction(formData: FormData): Promise<void> {
  "use server";
  const token = String(formData.get("token") ?? "");
  const decoded = verifyBookingToken(token);
  if (!decoded.ok) {
    redirect(`/book/${token}?status=invalid&reason=${decoded.reason}`);
  }
  const { n, e, p, s, d } = decoded.payload;
  const result = await bookMeeting({
    clientId: QWIKLY_OWN_CLIENT_ID,
    visitorName: n,
    visitorEmail: e,
    visitorPhone: p || null,
    businessType: null,
    start: s,
    end: d,
    notes: "Booked via setup-call email link.",
    conversationId: null,
  });
  if (!result.ok) {
    redirect(`/book/${token}?status=failed&reason=${result.reason}`);
  }
  redirect(`/book/${token}?status=confirmed&label=${encodeURIComponent(result.label)}`);
}

function formatLabelSAST(iso: string): string {
  return new Date(iso).toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
}

export default function BookPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { status?: string; label?: string; reason?: string };
}) {
  const { token } = params;
  const decoded = verifyBookingToken(token);

  if (!decoded.ok) {
    return (
      <ResultLayout
        eyebrow="Link issue"
        title={decoded.reason === "expired" ? "Link expired" : "Link not valid"}
        body={
          decoded.reason === "expired"
            ? "This booking link has expired. Send us a quick note and we'll email fresh times."
            : "We couldn't verify this booking link. Send us a quick note and we'll email fresh times."
        }
        ctaHref="/contact"
        ctaLabel="Get new times"
      />
    );
  }

  if (searchParams.status === "confirmed") {
    return (
      <ResultLayout
        eyebrow="Booked"
        title={searchParams.label || "You're booked in"}
        body="Confirmation email with the Google Meet link is on its way to your inbox. Give it a minute, and check your junk folder if you don't see it."
        ctaHref="/"
        ctaLabel="Back to home"
      />
    );
  }

  if (searchParams.status === "failed") {
    if (searchParams.reason === "slot_taken") {
      return (
        <ResultLayout
          eyebrow="Slot just taken"
          title="That time was booked a moment ago"
          body="Use the contact form and we'll email fresh slots straight away."
          ctaHref="/contact"
          ctaLabel="Get new times"
        />
      );
    }
    return (
      <ResultLayout
        eyebrow="Calendar hiccup"
        title="Couldn't lock it in"
        body="The team will reach out to confirm a time directly. Sorry about that."
        ctaHref="/contact"
        ctaLabel="Send us a note"
      />
    );
  }

  if (searchParams.status === "invalid") {
    return (
      <ResultLayout
        eyebrow="Link issue"
        title="Link no longer valid"
        body="Send us a quick note and we'll email fresh times."
        ctaHref="/contact"
        ctaLabel="Get new times"
      />
    );
  }

  const label = formatLabelSAST(decoded.payload.s);

  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">
        <p className="eyebrow text-ember mb-3">Confirm your slot</p>
        <h1 className="font-display text-3xl text-ink mb-3 leading-tight">{label}</h1>
        <p className="text-ink-500 mb-8">
          15-minute Google Meet with the Clarke Agency team to set Qwikly up live with you.
        </p>
        <form action={confirmBookingAction}>
          <input type="hidden" name="token" value={token} />
          <button
            type="submit"
            className="w-full px-8 py-3 bg-ember text-paper rounded-xl font-medium text-sm hover:bg-ember/90 transition-colors cursor-pointer"
          >
            Confirm booking
          </button>
        </form>
        <p className="text-ink-400 text-xs mt-4">
          Click confirm and the Google Meet invite arrives in your inbox.
        </p>
      </div>
    </main>
  );
}

function ResultLayout({
  eyebrow,
  title,
  body,
  ctaHref,
  ctaLabel,
}: {
  eyebrow: string;
  title: string;
  body: string;
  ctaHref: string;
  ctaLabel: string;
}) {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6 py-16">
      <div className="max-w-md w-full text-center">
        <p className="eyebrow text-ember mb-3">{eyebrow}</p>
        <h1 className="font-display text-3xl text-ink mb-3 leading-tight">{title}</h1>
        <p className="text-ink-500 mb-8">{body}</p>
        <Link
          href={ctaHref}
          className="inline-block px-8 py-3 bg-ember text-paper rounded-xl font-medium text-sm hover:bg-ember/90 transition-colors"
        >
          {ctaLabel}
        </Link>
      </div>
    </main>
  );
}
