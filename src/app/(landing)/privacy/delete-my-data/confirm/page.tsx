"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type ConfirmState =
  | { status: "loading" }
  | {
      status: "success";
      conversationsAffected: number;
      messagesAffected: number;
      documentsAffected: number;
      message: string;
    }
  | { status: "error"; message: string };

function ConfirmContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [state, setState] = useState<ConfirmState>({ status: "loading" });

  useEffect(() => {
    if (!token) {
      setState({ status: "error", message: "Missing confirmation token. Use the link from your email." });
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/privacy/delete-my-data/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok || !data.ok) {
          setState({
            status: "error",
            message: data.error || "Could not confirm your request. Please try again.",
          });
          return;
        }
        setState({
          status: "success",
          conversationsAffected: data.conversations_affected ?? 0,
          messagesAffected: data.messages_affected ?? 0,
          documentsAffected: data.documents_affected ?? 0,
          message: data.message ?? "Your request has been processed.",
        });
      } catch {
        if (!cancelled) {
          setState({
            status: "error",
            message: "Could not reach the server. Please try again in a moment.",
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">
            <Link href="/privacy" className="hover:text-ember transition-colors cursor-pointer">
              Privacy
            </Link>{" "}
            /{" "}
            <Link href="/privacy/delete-my-data" className="hover:text-ember transition-colors cursor-pointer">
              Delete my data
            </Link>{" "}
            / Confirm
          </p>

          <h1 className="font-display font-medium text-[clamp(2rem,4.5vw,3rem)] leading-tight tracking-tight text-ink mb-4">
            {state.status === "loading"
              ? "Confirming your request…"
              : state.status === "success"
              ? "Request confirmed"
              : "Could not confirm"}
          </h1>

          {state.status === "loading" && (
            <div className="flex items-center gap-3 text-ink-500 text-sm">
              <span className="inline-block w-4 h-4 border-2 border-ink/20 border-t-ink rounded-full animate-spin" aria-hidden />
              <span>Removing your data, one moment…</span>
            </div>
          )}

          {state.status === "success" && (
            <div className="border border-emerald-200 bg-emerald-50 rounded-2xl p-6">
              <p className="text-ink-700 leading-relaxed mb-4">{state.message}</p>
              {state.conversationsAffected > 0 ? (
                <ul className="space-y-1 text-sm text-ink-700">
                  <li>· Conversations soft-deleted: <strong>{state.conversationsAffected}</strong></li>
                  <li>· Messages soft-deleted: <strong>{state.messagesAffected}</strong></li>
                  <li>· Documents soft-deleted: <strong>{state.documentsAffected}</strong></li>
                </ul>
              ) : null}
              <p className="text-xs text-ink-500 mt-4 leading-relaxed">
                Soft-deleted data is removed from all dashboards, exports, and reports immediately. The
                rows are permanently removed on the next daily retention run, except for fields we are
                legally required to keep (such as billing records).
              </p>
            </div>
          )}

          {state.status === "error" && (
            <div className="border border-red-200 bg-red-50 rounded-2xl p-6">
              <p className="text-sm text-red-700 leading-relaxed mb-4">{state.message}</p>
              <Link
                href="/privacy/delete-my-data"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-ink text-paper text-sm font-semibold hover:bg-ink/90 transition-colors cursor-pointer"
              >
                Start a new request
              </Link>
            </div>
          )}

          <div className="mt-12 pt-8 border-t border-ink/[0.07]">
            <p className="text-sm text-ink-700 leading-relaxed">
              Questions? Email{" "}
              <a href="mailto:hello@qwikly.co.za" className="text-ember underline transition-colors">
                hello@qwikly.co.za
              </a>
              . You can also lodge a complaint with the Information Regulator of South Africa at{" "}
              <a
                href="https://inforegulator.org.za"
                target="_blank"
                rel="noopener noreferrer"
                className="text-ember underline transition-colors"
              >
                inforegulator.org.za
              </a>
              .
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function ConfirmPage() {
  return (
    <Suspense fallback={null}>
      <ConfirmContent />
    </Suspense>
  );
}
