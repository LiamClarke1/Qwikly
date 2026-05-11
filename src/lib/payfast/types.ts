import 'server-only';

/**
 * Subset of fields PayFast posts in an ITN. PayFast documents the full
 * payload at https://developers.payfast.co.za/docs#notify_url. We type the
 * fields we actually read; unrecognised fields fail signature verification
 * because they'd alter the canonical signing string.
 */
export interface PayfastItnPayload {
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: 'COMPLETE' | 'FAILED' | 'CANCELLED' | 'REFUND';
  item_name: string;
  amount_gross: string; // PayFast sends decimal strings, e.g. "699.00"
  amount_fee?: string;
  amount_net?: string;
  custom_str1?: string; // we use this for client_id
  custom_str2?: string; // we use this for subscription_id
  custom_str3?: string; // we use this for purpose
  custom_str4?: string;
  custom_str5?: string;
  email_address?: string;
  merchant_id: string;
  token?: string; // subscription token, present on subscription payments
  billing_date?: string; // YYYY-MM-DD next billing date for subscriptions
  signature: string;
  [key: string]: string | undefined;
}

export interface CheckoutParams {
  m_payment_id: string;
  amount_zar_cents: number;
  item_name: string;
  item_description?: string;
  email_address?: string;
  client_id: string | number;
  subscription_id?: string | number;
  purpose:
    | 'subscription_setup'
    | 'subscription_renewal'
    | 'upgrade_proration'
    | 'topup_leads'
    | 'topup_ai_credit'
    | 'card_update';
  /** Subscription setup (recurring token) vs one-off / ad-hoc */
  recurring: boolean;
  /** Monthly recurring amount in ZAR cents, only for recurring=true. */
  recurring_amount_zar_cents?: number;
  /** First billing date YYYY-MM-DD for the recurring token, only for recurring=true. */
  billing_date?: string;
}

export interface AdhocChargeParams {
  token: string;
  amount_zar_cents: number;
  item_name: string;
  m_payment_id: string;
}

export interface AdhocChargeResponse {
  status: 'success' | 'failed';
  pf_payment_id?: string;
  message?: string;
}
