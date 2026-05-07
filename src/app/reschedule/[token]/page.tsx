import Link from "next/link";
import { redirect } from "next/navigation";
import { verifyRescheduleToken } from "@/lib/booking-link";
import {
  resend,
  FROM,
  rescheduleHostNotificationHtml,
  rescheduleAcknowledgmentHtml,
} from "@/lib/resend";

export const dynamic = "force-dynamic";

const HOST_RECIPIENT = process.env.SUPPORT_DIGEST_TO ?? "clarkeagency1@outlook.com";

async function submitRescheduleAction(formData: FormData): Promise<void> {
  "use server";

  const token = String(formData.get("token") ?? "");
  const preferredTimes = String(formData.get("preferred_times") ?? "").trim();

  const decoded = verifyRescheduleToken(token);
  if (!decoded.ok) {
    redirect(`/reschedule/${token}?status=invalid&reason=${decoded.reason}`);
  }
  if (preferredTimes.length < 5) {
    redirect(`/reschedule/${token}?status=missing`);
  }
  if (preferredTimes.length > 600) {
    redirect(`/reschedule/${token}?status=too_long`);
  }

  const { n: name, e: email, p: phone, l: originalSlots } = decoded.payload;

  // Send the orange-special acknowledgment to the visitor first.
  // We don't await both in parallel because if the host send fails we still want
  // the visitor to get their confirmation — better than two-way silence.
  try {
    await resend.emails.send({
      from: FROM,
      to: [email],
      subject: "We've got your times, we'll come back shortly",
      html: rescheduleAcknowledgmentHtml({ visitorName: name }),
    });
  } catch (err) {
    console.error("[reschedule] visitor ack send failed:", err);
  }

  // Then notify the team so they can manually pick fresh times.
  try {
    await resend.emails.send({
      from: "Qwikly Reschedule <hello@qwikly.co.za>",
      to: [HOST_RECIPIENT],
      replyTo: email,
      subject: `[Qwikly Reschedule] ${name} needs different times`,
      html: rescheduleHostNotificationHtml({
        name,
        email,
        phone: phone || null,
        preferredTimes,
        originalSlots: originalSlots ?? [],
      }),
    });
  } catch (err) {
    console.error("[reschedule] host notification send failed:", err);
  }

  redirect(`/reschedule/${token}?status=sent`);
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
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <main className="min-h-screen bg-paper flex items-center justify-center px-6 py-20">
      <div className="max-w-md w-full text-center">
        <p className="eyebrow text-ember mb-4">{eyebrow}</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink mb-4">{title}</h1>
        <p className="text-ink-500 leading-relaxed mb-8">{body}</p>
        {ctaHref && ctaLabel && (
          <Link
            href={ctaHref}
            className="inline-block px-6 py-3 bg-ember text-paper rounded-xl font-medium text-sm hover:bg-ember/90 transition-colors"
          >
            {ctaLabel}
          </Link>
        )}
      </div>
    </main>
  );
}

export default function ReschedulePage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { status?: string; reason?: string };
}) {
  const { token } = params;
  const decoded = verifyRescheduleToken(token);

  if (!decoded.ok) {
    return (
      <ResultLayout
        eyebrow="Link issue"
        title={decoded.reason === "expired" ? "Link expired" : "Link not valid"}
        body={
          decoded.reason === "expired"
            ? "This reschedule link expired. Use the contact form to reach out and we'll send fresh times."
            : "We couldn't verify this reschedule link. Use the contact form to reach out."
        }
        ctaHref="/contact"
        ctaLabel="Contact us"
      />
    );
  }

  if (searchParams.status === "sent") {
    return (
      <ResultLayout
        eyebrow="Got it"
        title="We'll come back with fresh times."
        body="A confirmation is on its way to your inbox. The Qwikly team will reach out within one business day with a slot that works for both of us."
        ctaHref="/"
        ctaLabel="Back to home"
      />
    );
  }

  const { n: name, l: originalSlots } = decoded.payload;
  const firstName = name.split(" ")[0];

  return (
    <main className="min-h-screen bg-paper px-6 py-20">
      <div className="max-w-xl mx-auto">
        <p className="eyebrow text-ember mb-4">Reschedule</p>
        <h1 className="font-display text-3xl md:text-4xl text-ink mb-4">
          Hey {firstName}, when does work for you?
        </h1>
        <p className="text-ink-500 leading-relaxed mb-8">
          Tell us a few times that suit you over the next week and we&rsquo;ll send fresh slots within one business day.
        </p>

        {searchParams.status === "missing" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">
            Please share at least one time that works for you.
          </div>
        )}
        {searchParams.status === "too_long" && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 mb-6">
            That&rsquo;s a lot of detail. Trim to the essentials, please (max 600 characters).
          </div>
        )}

        {originalSlots && originalSlots.length > 0 && (
          <div className="bg-paper-deep border border-ink/[0.07] rounded-2xl p-5 mb-6">
            <p className="eyebrow text-ink-500 mb-3">Slots we offered (declined)</p>
            <ul className="space-y-1.5 text-sm text-ink-700">
              {originalSlots.map((s) => (
                <li key={s} className="line-through opacity-60">{s}</li>
              ))}
            </ul>
          </div>
        )}

        <form action={submitRescheduleAction} className="space-y-5">
          <input type="hidden" name="token" value={token} />
          <div>
            <label htmlFor="preferred_times" className="eyebrow text-ink-500 mb-2 block">
              Times that work
            </label>
            <textarea
              id="preferred_times"
              name="preferred_times"
              required
              minLength={5}
              maxLength={600}
              rows={6}
              placeholder="e.g. Tuesday afternoon after 14:00 or Wednesday morning before 11:00. Mornings work best for me."
              className="w-full px-4 py-3 bg-white border border-ink/15 rounded-xl text-ink text-sm focus:outline-none focus:ring-2 focus:ring-ember/40 focus:border-ember/40 transition-all placeholder:text-ink-400"
            />
          </div>
          <button
            type="submit"
            className="w-full sm:w-auto px-8 py-3 bg-ember text-paper rounded-xl font-medium text-sm hover:bg-ember/90 transition-colors cursor-pointer"
          >
            Send to the team
          </button>
        </form>
      </div>
    </main>
  );
}
