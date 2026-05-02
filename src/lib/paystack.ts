const BASE = "https://api.paystack.co";

function headers() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return { Authorization: `Bearer ${key}`, "Content-Type": "application/json" };
}

async function req<T>(
  method: "GET" | "POST",
  path: string,
  body?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message ?? "Paystack error");
  return json.data as T;
}

export interface PaystackCustomer {
  customer_code: string;
  email: string;
  id: number;
}

export interface PaystackSubscription {
  subscription_code: string;
  email_token: string;
  status: "active" | "non-renewing" | "attention" | "completed" | "cancelled";
  plan: { plan_code: string; name: string; interval: string; amount: number };
  customer: { customer_code: string; email: string };
  next_payment_date: string;
  authorization?: {
    card_type: string;
    last4: string;
    exp_month: string;
    exp_year: string;
    bank: string;
    channel: string;
  };
}

export interface PaystackTransaction {
  id: number;
  reference: string;
  amount: number;
  currency: string;
  status: "success" | "failed" | "abandoned";
  paid_at: string;
  created_at: string;
  plan_object?: { plan_code: string; name: string };
  plan?: string;
  customer: { customer_code: string; email: string };
}

export const paystack = {
  customer: {
    create: (params: { email: string; first_name?: string; last_name?: string }) =>
      req<PaystackCustomer>("POST", "/customer", params),
    fetch: (code: string) =>
      req<PaystackCustomer & { subscriptions: PaystackSubscription[] }>("GET", `/customer/${code}`),
  },
  transaction: {
    initialize: (params: {
      email: string;
      amount: number;
      plan?: string;
      callback_url?: string;
      metadata?: Record<string, unknown>;
    }) =>
      req<{ authorization_url: string; access_code: string; reference: string }>(
        "POST",
        "/transaction/initialize",
        { currency: "ZAR", ...params }
      ),
    list: (params: { customer?: string; perPage?: number }) => {
      const qs = new URLSearchParams(
        Object.fromEntries(
          Object.entries(params)
            .filter(([, v]) => v != null)
            .map(([k, v]) => [k, String(v)])
        )
      ).toString();
      return req<PaystackTransaction[]>("GET", `/transaction?${qs}`);
    },
  },
  subscription: {
    fetch: (code: string) => req<PaystackSubscription>("GET", `/subscription/${code}`),
    disable: (params: { code: string; token: string }) =>
      req<{ message: string }>("POST", "/subscription/disable", params),
    enable: (params: { code: string; token: string }) =>
      req<{ message: string }>("POST", "/subscription/enable", params),
    manageLink: (code: string) =>
      req<{ link: string }>("GET", `/subscription/${code}/manage/link`),
  },
};

// Plan code env var lookup
export const PLAN_MAP: Record<string, string | undefined> = {
  starter_monthly: process.env.PAYSTACK_PLAN_STARTER_MONTHLY,
  starter_annual: process.env.PAYSTACK_PLAN_STARTER_ANNUAL,
  pro_monthly: process.env.PAYSTACK_PLAN_PRO_MONTHLY,
  pro_annual: process.env.PAYSTACK_PLAN_PRO_ANNUAL,
  premium_monthly: process.env.PAYSTACK_PLAN_PREMIUM_MONTHLY,
  premium_annual: process.env.PAYSTACK_PLAN_PREMIUM_ANNUAL,
};

// Amount in ZAR cents — monthly × 12 × 0.85 for annual (15% off)
export const PLAN_AMOUNTS: Record<string, number> = {
  starter_monthly: 39900,
  starter_annual: 406800,   // R399 × 12 × 0.85 = R4,068
  pro_monthly: 99900,
  pro_annual: 1018800,      // R999 × 12 × 0.85 = R10,188
  premium_monthly: 249900,
  premium_annual: 2549000,  // R2,499 × 12 × 0.85 = R25,490
};

// Reverse lookup: plan_code → { plan, cycle }
export function planFromCode(planCode: string): { plan: string; cycle: string } | null {
  for (const [key, code] of Object.entries(PLAN_MAP)) {
    if (code === planCode) {
      const [plan, cycle] = key.split("_");
      return { plan, cycle };
    }
  }
  return null;
}
