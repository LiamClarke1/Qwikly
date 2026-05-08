"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ContactAvailabilityResponse,
  ContactAvailabilitySlot,
} from "@/app/api/web/contact-availability/route";

export type AvailabilityState = {
  loading: boolean;
  availability: Record<string, ContactAvailabilitySlot[]> | null;
  reason: "calendar_not_connected" | "calendar_disconnected" | "error" | "empty" | null;
  refetch: () => void;
};

export function useAvailability(enabled: boolean): AvailabilityState {
  const [loading, setLoading] = useState(false);
  const [availability, setAvailability] = useState<Record<
    string,
    ContactAvailabilitySlot[]
  > | null>(null);
  const [reason, setReason] = useState<AvailabilityState["reason"]>(null);
  const reqId = useRef(0);

  const fetchOnce = useCallback(async () => {
    const id = ++reqId.current;
    setLoading(true);
    setReason(null);
    try {
      const res = await fetch("/api/web/contact-availability", { cache: "no-store" });
      const data = (await res.json()) as ContactAvailabilityResponse;
      if (id !== reqId.current) return;
      if (!data.ok) {
        setAvailability(null);
        setReason(data.reason);
      } else if (Object.keys(data.availability).length === 0) {
        setAvailability({});
        setReason("empty");
      } else {
        setAvailability(data.availability);
        setReason(null);
      }
    } catch {
      if (id !== reqId.current) return;
      setAvailability(null);
      setReason("error");
    } finally {
      if (id === reqId.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchOnce();
  }, [enabled, fetchOnce]);

  return { loading, availability, reason, refetch: fetchOnce };
}
