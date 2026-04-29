export type CrmStatus = "onboarding" | "active" | "at_risk" | "paused" | "churned";
export type CrmPlan   = "starter" | "growth" | "pro" | "enterprise";
export type TaskStatus   = "open" | "in_progress" | "done" | "cancelled";
export type TaskPriority = "low" | "medium" | "high" | "urgent";

export interface CrmTag {
  id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CrmClientListItem {
  id: number;
  business_name: string | null;
  owner_name: string | null;
  client_email: string | null;
  whatsapp_number: string | null;
  logo_url: string | null;
  trade: string | null;
  industry: string | null;
  website: string | null;
  crm_status: CrmStatus;
  plan: CrmPlan;
  mrr_zar: number;
  health_score: number;
  onboarding_step: number | null;
  onboarding_complete: boolean | null;
  web_widget_status: string | null;
  last_activity_at: string | null;
  created_at: string;
  account_manager_id: string | null;
  ltv_zar: number;
  tags: CrmTag[];
  conversation_count: number;
  channels: string[];
}

export interface CrmClientDetail extends CrmClientListItem {
  address: string | null;
  commission_rate: number | null;
  risk_score: number | null;
  next_renewal_at: string | null;
  web_widget_domain: string | null;
  web_widget_enabled: boolean | null;
  services_offered: string | null;
  unique_selling_point: string | null;
  system_prompt: string | null;
  notes_count: number;
  tasks_open: number;
  bookings_total: number;
}

export interface CrmNote {
  id: string;
  client_id: number;
  author_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
}

export interface CrmTask {
  id: string;
  client_id: number;
  assignee_id: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_at: string | null;
  done_at: string | null;
  created_at: string;
}

export interface CrmContact {
  id: string;
  client_id: number;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  is_primary: boolean;
  created_at: string;
}

export interface CrmFile {
  id: string;
  client_id: number;
  uploaded_by: string | null;
  name: string;
  mime_type: string | null;
  size_bytes: number | null;
  storage_path: string;
  created_at: string;
}

export interface CrmEvent {
  id: string;
  client_id: number;
  actor_id: string | null;
  event_type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

export interface CrmReport {
  id: string;
  client_id: number;
  period_start: string;
  period_end: string;
  status: "pending" | "generating" | "ready" | "failed";
  storage_path: string | null;
  email_sent_at: string | null;
  email_opened_at: string | null;
  downloaded_at: string | null;
  generated_at: string | null;
  metrics_snapshot: Record<string, unknown> | null;
  created_at: string;
}

export interface CrmSavedView {
  id: string;
  owner_id: string | null;
  name: string;
  filters: Record<string, unknown>;
  sort_by: string | null;
  sort_dir: string | null;
  created_at: string;
}

export interface CrmStatsSummary {
  conversations_total: number;
  conversations_whatsapp: number;
  conversations_email: number;
  conversations_web: number;
  leads_captured: number;
  leads_converted: number;
  bookings_created: number;
  avg_response_time_s: number;
  messages_handled_by_ai: number;
}

export interface CrmStatsDay {
  date: string;
  conversations_total: number;
  conversations_whatsapp: number;
  conversations_email: number;
  conversations_web: number;
  leads_captured: number;
  bookings_created: number;
}
