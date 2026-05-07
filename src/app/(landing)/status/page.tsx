import type { Metadata } from "next";
import { headers } from "next/headers";

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
  latencyMs?: number;
}

interface HealthResponse {
  status: "ok" | "degraded";
  timestamp: string;
  uptime_ms: number;
  services: { name: string; status: "ok" | "error"; latency_ms?: number; error?: string }[];
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

// /api/health returns short check names like "database", "whatsapp", "email",
// "ai". This page presents a friendlier service breakdown — derive each row
// from the underlying check it depends on.
const SERVICE_VIEW: { name: string; description: string; deps: string[] }[] = [
  { name: "Web Application", description: "Dashboard and public site", deps: ["database"] },
  { name: "Assistant Messaging", description: "Lead qualification and booking", deps: ["ai", "whatsapp"] },
  { name: "WhatsApp Delivery", description: "Twilio message delivery layer", deps: ["whatsapp"] },
  { name: "Email Delivery", description: "Booking confirmations and notifications", deps: ["email"] },
];

async function getHealth(): Promise<{
  data: HealthResponse | null;
  ok: boolean;
  fetchedAt: string;
}> {
  const fetchedAt = new Date().toISOString();
  try {
    const h = headers();
    const host = h.get("host") ?? "www.qwikly.co.za";
    const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
    const res = await fetch(`${proto}://${host}/api/health`, { cache: "no-store" });
    const data = (await res.json()) as HealthResponse;
    return { data, ok: res.ok, fetchedAt };
  } catch {
    return { data: null, ok: false, fetchedAt };
  }
}

function deriveServices(data: HealthResponse | null): Service[] {
  const checkMap = new Map<string, { ok: boolean; latency?: number }>();
  data?.services.forEach((s) => {
    checkMap.set(s.name, { ok: s.status === "ok", latency: s.latency_ms });
  });

  return SERVICE_VIEW.map(({ name, description, deps }) => {
    const states = deps.map((d) => checkMap.get(d));
    const anyMissing = states.some((s) => !s);
    const allOk = states.every((s) => s?.ok);
    const status: ServiceStatus = anyMissing ? "degraded" : allOk ? "operational" : "outage";
    const latencyMs = states.find((s) => s?.latency !== undefined)?.latency;
    return { name, description, status, latencyMs };
  });
}

export default async function StatusPage() {
  const { data, ok, fetchedAt } = await getHealth();
  const services = deriveServices(data);
  const allOperational = ok && data?.status === "ok" && services.every((s) => s.status === "operational");
  const lastChecked = data?.timestamp ?? fetchedAt;
  const lastCheckedLabel = new Date(lastChecked).toLocaleString("en-ZA", {
    timeZone: "Africa/Johannesburg",
  });

  return (
    <div className="bg-paper min-h-screen">
      <section className="pt-36 pb-24 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="eyebrow text-ink-500 mb-6">System status</p>
          <h1 className="font-display font-medium text-[clamp(2.5rem,5vw,4rem)] leading-tight tracking-tight text-ink mb-4">
            {!data ? (
              <>
                Health check{" "}
                <em className="italic font-light text-yellow-600">unavailable.</em>
              </>
            ) : allOperational ? (
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
            Last checked: {lastCheckedLabel} SAST
            {data ? ` · uptime check ${data.uptime_ms} ms` : ""}
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
                      {svc.latencyMs !== undefined ? ` · ${svc.latencyMs} ms` : ""}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-12 bg-paper-deep border border-ink/[0.07] rounded-2xl p-6">
            <p className="eyebrow text-ink-500 mb-3">Incident history</p>
            <p className="text-sm text-ink-500 italic">
              {/*
                /api/health (Terminal 3) doesn't yet return an incident log.
                Until it does we say "no formal log" rather than fake a green
                "no incidents in 90 days" claim.
              */}
              No formal incident log yet. We&rsquo;re wiring the API to expose
              one, when it lands you&rsquo;ll see the last 90 days here.
            </p>
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
