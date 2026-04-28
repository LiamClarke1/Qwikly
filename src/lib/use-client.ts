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
  google_access_token?: string | null;
  google_refresh_token?: string | null;
  google_token_expiry?: number | null;
  system_prompt: string | null;
  ai_paused?: boolean;
  onboarding_complete?: boolean;
  // onboarding fields
  years_in_business?: string | null;
  certifications?: string | null;
  brands_used?: string | null;
  team_size?: string | null;
  services_offered?: string | null;
  services_excluded?: string | null;
  after_hours?: string | null;
  emergency_response?: string | null;
  charge_type?: string | null;
  callout_fee?: string | null;
  example_prices?: string | null;
  minimum_job?: string | null;
  free_quotes?: string | null;
  payment_methods?: string | null;
  payment_terms?: string | null;
  working_hours_text?: string | null;
  booking_lead_time?: string | null;
  booking_preference?: string | null;
  response_time?: string | null;
  unique_selling_point?: string | null;
  guarantees?: string | null;
  common_questions?: string | null;
  common_objections?: string | null;
  ai_tone?: string | null;
  ai_language?: string | null;
  ai_response_style?: string | null;
  ai_greeting?: string | null;
  ai_escalation_triggers?: string | null;
  ai_escalation_custom?: string | null;
  ai_unhappy_customer?: string | null;
  ai_always_do?: string | null;
  ai_never_say?: string | null;
  ai_sign_off?: string | null;
  // existing settings fields
  service_areas?: string[] | null;
  faq?: { q: string; a: string }[] | null;
  tone?: string | null;
  hours?: Record<string, [string, string] | null> | null;
  notification_email?: string | null;
  notification_phone?: string | null;
  meta_business_id?: string | null;
  meta_phone_number_id?: string | null;
}

export function useClient() {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("clients")
        .select("*")
        .limit(1)
        .maybeSingle();
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
