"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";

export interface ClientRow {
  id: string;
  business_name: string | null;
  trade: string | null;
  owner_name: string | null;
  whatsapp_number: string | null;
  google_calendar_id: string | null;
  system_prompt: string | null;
  ai_paused?: boolean;
}

export function useClient() {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("clients").select("*").limit(1).maybeSingle();
      if (!cancelled) {
        setClient((data as ClientRow) ?? null);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { client, loading, setClient };
}
