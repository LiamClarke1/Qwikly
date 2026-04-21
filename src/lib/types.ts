export type Client = {
  id: number;
  business_name: string;
  trade: string;
  whatsapp_number: string;
  owner_name: string | null;
  system_prompt: string;
  google_calendar_id: string | null;
  active: boolean;
  created_at: string;
  signup_id: string | null;
};

export type Conversation = {
  id: number;
  client_id: number;
  customer_phone: string;
  customer_name: string | null;
  status: "active" | "completed" | "escalated";
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: number;
  conversation_id: number;
  role: "customer" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type Booking = {
  id: number;
  conversation_id: number | null;
  client_id: number;
  customer_name: string;
  customer_phone: string;
  job_type: string | null;
  area: string | null;
  booking_datetime: string | null;
  status: string;
  created_at: string;
};
