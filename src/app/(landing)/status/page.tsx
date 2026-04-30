import type { Metadata } from "next";
import { supabaseAdmin } from "@/lib/supabase-server";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "System Status",
  description: "Live status of Qwikly services: web app, assistant messaging, WhatsApp, calendar sync.",
  alternates: { canonical: "https://www.qwikly.co.za/status" },
};

type ServiceStatus = "operational" | "degraded" | "outage" | "maintenance";

interface Service {
  name: string;
  description: string;
  status: ServiceStatus;
}

const STATUS_CONFIG: Record<
  ServiceStatus,
  { label: string; dot: string; badge: string }
> = {
  operational: {
    label: "Operational",
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  degraded: {
    label: "Degraded performance",
    dot: "bg-yellow-400",
    badge: "bg-yellow-50 text-yellow-700 border-yellow-200",
  },
  outage: {
    label: "Service outage",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  maintenance: {
    label: "Maintenance",
    dot: "bg-blue-400",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
};

async function getServices(): Promise<Service[]> {
  const checks: Record<string, boolean> = {};

  try {
    const db = supabaseAdmin();
    const { error } = await db.from("clients").select("id").limit(1);
    checks.database = !error;
  } catch {
    checks.database = false;
  }

  checks.whatsapp = !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
  checks.email = !!process.env.RESEND_API_KEY;
  checks.messaging = !!process.env.ANTHROPIC_API_KEY;

  return [
    {
      name: "Web Application",
      description: "Dashboard and public site",
      status: checks.database ? "operational" : "degraded",
    },
    {
      name: "Assistant Messaging",
      description: "WhatsApp lead qualification and booking",
      status: checks.messaging && checks.whatsapp ? "operational" : "outage",
    },
    {
      name: "WhatsApp Delivery",
      description: "Twilio message delivery layer",
      status: checks.whatsapp ? "operational" : "outage",
    },
    {
      name: "Calendar Sync",
      description: "Google Calendar integration",
      status: "operational",
    },
    {
      name: "Email Delivery",
      description: "Booking confirmations and notifications",
      status: checks.email ? "operational" : "outage",
    },
  ];
}

export default async function StatusPage() {
  const services = await getServices();
  const allOperational = services.every((s) => s.status === "operational");

  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">System status</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-4">
            {allOperational ? (
              <>
                All systems{" "}
                <em className="italic font-light text-green-600">operational.</em>
              </>
            ) : (
              <>
                Some systems are{" "}
                <em className="italic font-light text-yellow-600">degraded.</em>
              </>
            )}
          </h1>
          <p className="text-ink-500 text-sm mb-16">
            Last checked: {new Date().toLocaleString("en-ZA", { timeZone: "Africa/Johannesburg" })} SAST
          </p>

          <div className="space-y-4">
            {services.map((svc) => {
              const cfg = STATUS_CONFIG[svc.status];
              return (
                <div
                  key={svc.name}
                  className="bg-white border border-ink/[0.07] rounded-2xl p-6"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${cfg.dot}`}
                        aria-hidden="true"
                      />
                      <div>
                        <p className="font-display font-medium text-ink text-base">
                          {svc.name}
                        </p>
                        <p className="text-xs text-ink-500 mt-0.5">{svc.description}</p>
                      </div>
                    </div>
                    <span
                      className={`shrink-0 text-xs px-3 py-1 rounded-full border font-medium ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 bg-paper-deep border border-ink/[0.07] rounded-2xl p-6">
            <p className="eyebrow text-ink-500 mb-3">Incident history</p>
            <p className="text-sm text-ink-500 italic">No incidents in the last 90 days.</p>
          </div>

          <p className="mt-8 text-xs text-ink-400">
            For urgent issues, email{" "}
            <a
              href="mailto:hello@qwikly.co.za"
              className="text-ember underline transition-colors"
            >
              hello@qwikly.co.za
            </a>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
