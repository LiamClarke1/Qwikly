"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  mPaymentId: string;
}

export function PollSubscription({ mPaymentId }: Props) {
  const router = useRouter();
  const [status, setStatus] = useState<"polling" | "active" | "timeout">("polling");

  useEffect(() => {
    let cancelled = false;
    const start = Date.now();
    const tick = async () => {
      if (cancelled) return;
      try {
        const res = await fetch("/api/subscription", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          if (data.status === "active" && data.plan && data.plan !== "trial") {
            setStatus("active");
            setTimeout(() => router.push("/dashboard"), 600);
            return;
          }
        }
      } catch {
        // network blip, keep polling
      }
      if (Date.now() - start > 10_000) {
        setStatus("timeout");
        return;
      }
      setTimeout(tick, 2_000);
    };
    tick();
    return () => {
      cancelled = true;
    };
  }, [mPaymentId, router]);

  if (status === "active") {
    return <p className="text-sm text-gray-600">Payment confirmed, opening your dashboard...</p>;
  }
  if (status === "timeout") {
    return (
      <div className="space-y-3">
        <p className="text-sm text-gray-600">
          We&apos;re still confirming your payment. You&apos;ll get an email when it&apos;s done.
        </p>
        <a
          href="/dashboard"
          className="inline-block rounded bg-black px-4 py-2 text-sm font-medium text-white"
        >
          Open dashboard
        </a>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-black" />
      <p className="text-sm text-gray-600">Confirming your payment...</p>
    </div>
  );
}
