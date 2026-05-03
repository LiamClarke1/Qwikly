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
  address?: string | null;
  faq?: { q: string; a: string }[] | null;
  tone?: string | null;
  hours?: Record<string, [string, string] | null> | null;
  notification_email?: string | null;
  notification_phone?: string | null;
  billing_email?: string | null;
  client_email?: string | null;
  meta_business_id?: string | null;
  meta_phone_number_id?: string | null;
  // invoicing fields (added in migration-invoicing-v2)
  vat_number?: string | null;
  bank_name?: string | null;
  bank_account_number?: string | null;
  bank_branch_code?: string | null;
  bank_account_type?: string | null;
  invoice_logo_url?: string | null;
  invoice_accent_color?: string | null;
  invoice_footer_text?: string | null;
  invoice_terms_default?: string | null;
  invoice_counter?: number | null;
  plan?: string | null;
  billing_active?: boolean | null;
  trial_ends_at?: string | null;
  commission_rate?: number | null;
  risk_score?: number | null;
  risk_flags?: string[] | null;
  allow_cash_invoices?: boolean | null;
  reminder_tone?: string | null;
  // website widget fields
  web_widget_enabled?: boolean | null;
  web_widget_domain?: string | null;
  web_widget_color?: string | null;
  web_widget_greeting?: string | null;
  web_widget_position?: "bottom-right" | "bottom-left" | null;
  web_widget_launcher_label?: string | null;
  web_widget_status?: "pending" | "verified" | "disconnected" | null;
  web_widget_verified_at?: string | null;
  web_widget_last_seen_at?: string | null;
  web_widget_domain_whitelist?: string | null;
  onboarding_step?: number | null;
  onboarding_completed_at?: string | null;
  working_hours?: Record<string, [string, string] | null> | null;
  after_hours_mode?: "book_next_available" | "closed_message" | "always_open" | null;
  // settings v2 fields (migration-settings-v2.sql)
  profile_photo_url?: string | null;
  timezone?: string | null;
  website?: string | null;
  industry?: string | null;
  support_email?: string | null;
  brand_color?: string | null;
  delete_requested_at?: string | null;
  ga_measurement_id?: string | null;
  meta_pixel_id?: string | null;
  public_key?: string | null;
}

export function useClient() {
  const [client, setClient] = useState<ClientRow | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from("clients")
      .select("*")
      .eq("auth_user_id", session.user.id)
      .maybeSingle();
    setClient((data as ClientRow) ?? null);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { client, loading, setClient, refresh: load };
}
