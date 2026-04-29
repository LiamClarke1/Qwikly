"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Globe, MessageSquare, BookOpen, User, Mail, Phone,
  CheckCircle2, Clock, RefreshCw, Loader2, Trash2, Globe2,
} from "lucide-react";
import { timeAgo } from "@/lib/format";

interface ClientDetail {
  id: number;
  business_name: string | null;
  trade: string | null;
  owner_name: string | null;
  client_email: string | null;
  whatsapp_number: string | null;
  web_widget_domain: string | null;
  web_widget_status: string | null;
  onboarding_complete: boolean | null;
  created_at: string;
  services_offered: string | null;
  address: string | null;
  unique_selling_point: string | null;
}

interface Conversation {
  id: string;
  customer_name: string | null;
  customer_phone: string | null;
  channel: string;
  status: string;
  created_at: string;
  summary: string | null;
  intent: string | null;
  next_action: string | null;
  email: string | null;
}

interface KbArticle {
  id: string;
  title: string;
  body: string;
  is_active: boolean;
  updated_at: string;
}

const TABS = ["Overview", "Conversations", "Knowledge"] as const;
type Tab = typeof TABS[number];

const CHANNEL_LABELS: Record<string, string> = {
  web_chat: "Web",
  whatsapp: "WhatsApp",
  email: "Email",
};

function ChannelBadge({ channel }: { channel: string }) {
  const label = CHANNEL_LABELS[channel] ?? channel;
  const cls = channel === "whatsapp"
    ? "bg-emerald-500/10 text-emerald-400"
    : channel === "email"
    ? "bg-blue-500/10 text-blue-400"
    : "bg-violet-500/10 text-violet-400";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${cls}`}>{label}</span>
  );
}

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useState<Tab>("Overview");
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [kb, setKb] = useState<KbArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [scraping, setScraping] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/clients/${id}`);
    if (res.ok) {
      const d = await res.json();
      setClient(d.client);
      setConversations(d.conversations);
      setKb(d.kb_articles);
      if (d.client?.web_widget_domain) setScrapeUrl(`https://${d.client.web_widget_domain}`);
    }
    setLoading(false);
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function scrape() {
    if (!scrapeUrl.trim()) return;
    setScraping(true);
    setScrapeMsg(null);
    try {
      const res = await fetch("/api/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ client_id: id, url: scrapeUrl.trim() }),
      });
      const d = await res.json();
      if (res.ok) {
        setScrapeMsg({ ok: true, msg: `Imported ${d.sections} sections from ${d.hostname}` });
        await load();
      } else {
        setScrapeMsg({ ok: false, msg: d.error ?? "Scrape failed" });
      }
    } catch {
      setScrapeMsg({ ok: false, msg: "Network error" });
    }
    setScraping(false);
  }

  if (loading) return (
    <div className="space-y-4 animate-pulse">
      <div className="h-8 w-48 rounded-xl bg-white/[0.04]" />
      <div className="h-32 rounded-2xl bg-white/[0.04]" />
    </div>
  );

  if (!client) return (
    <div className="text-center py-20 text-fg-muted text-small">Client not found.</div>
  );

  const statusOk = client.web_widget_status === "verified";

  return (
    <div className="animate-fade-in max-w-5xl">
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-small text-fg-muted hover:text-fg mb-6 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> All clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-h1 text-fg">{client.business_name ?? "Unnamed"}</h1>
          <p className="text-small text-fg-muted mt-0.5">{client.trade ?? "No trade set"}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {statusOk ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 text-small font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-400 text-small font-medium">
              <Clock className="w-3.5 h-3.5" /> {client.onboarding_complete ? "Pending" : "Setup"}
            </span>
          )}
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        <div className="bg-bg-card border border-line rounded-2xl p-4">
          <p className="text-tiny text-fg-faint uppercase tracking-widest font-semibold mb-1">Conversations</p>
          <p className="text-display-2 font-display text-fg">{conversations.length}</p>
        </div>
        <div className="bg-bg-card border border-line rounded-2xl p-4">
          <p className="text-tiny text-fg-faint uppercase tracking-widest font-semibold mb-1">Knowledge articles</p>
          <p className="text-display-2 font-display text-fg">{kb.length}</p>
        </div>
        <div className="bg-bg-card border border-line rounded-2xl p-4">
          <p className="text-tiny text-fg-faint uppercase tracking-widest font-semibold mb-1">Joined</p>
          <p className="text-small font-semibold text-fg">{timeAgo(client.created_at)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-line">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-small font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              tab === t ? "border-brand text-brand" : "border-transparent text-fg-muted hover:text-fg"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === "Overview" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-bg-card border border-line rounded-2xl p-5 space-y-4">
            <p className="text-small font-semibold text-fg">Business info</p>
            <InfoRow icon={<User className="w-4 h-4" />} label="Owner" value={client.owner_name} />
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={client.client_email} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="WhatsApp" value={client.whatsapp_number} />
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Domain" value={client.web_widget_domain} />
            {client.address && <InfoRow icon={<Globe2 className="w-4 h-4" />} label="Address" value={client.address} />}
          </div>
          <div className="space-y-4">
            {client.services_offered && (
              <div className="bg-bg-card border border-line rounded-2xl p-5">
                <p className="text-tiny uppercase tracking-widest text-fg-faint font-semibold mb-2">Services</p>
                <p className="text-small text-fg-muted leading-relaxed">{client.services_offered}</p>
              </div>
            )}
            {client.unique_selling_point && (
              <div className="bg-bg-card border border-line rounded-2xl p-5">
                <p className="text-tiny uppercase tracking-widest text-fg-faint font-semibold mb-2">USP</p>
                <p className="text-small text-fg-muted leading-relaxed">{client.unique_selling_point}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversations tab */}
      {tab === "Conversations" && (
        <div>
          {conversations.length === 0 ? (
            <div className="text-center py-16 text-fg-muted text-small">No conversations yet.</div>
          ) : (
            <div className="rounded-2xl border border-line bg-bg-card overflow-hidden">
              {conversations.map((c, i) => (
                <div
                  key={c.id}
                  className={`px-5 py-4 ${i > 0 ? "border-t border-line" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/[0.06] flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-fg-muted" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-small font-semibold text-fg">{c.customer_name ?? "Visitor"}</p>
                        <ChannelBadge channel={c.channel} />
                        <span className="text-tiny text-fg-faint">{timeAgo(c.created_at)}</span>
                      </div>
                      {c.summary && <p className="text-[12px] text-fg-muted mt-0.5 line-clamp-2">{c.summary}</p>}
                      {c.intent && (
                        <p className="text-[11px] text-fg-faint mt-1">
                          <span className="text-brand">Intent:</span> {c.intent}
                        </p>
                      )}
                    </div>
                    {c.email && (
                      <div className="shrink-0 text-right">
                        <p className="text-tiny text-fg-faint">{c.email}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Knowledge tab */}
      {tab === "Knowledge" && (
        <div className="space-y-5">
          {/* Scrape section */}
          <div className="bg-bg-card border border-line rounded-2xl p-5">
            <p className="text-small font-semibold text-fg mb-1 flex items-center gap-2">
              <Globe className="w-4 h-4 text-brand" />
              Import from website
            </p>
            <p className="text-tiny text-fg-muted mb-4">
              Scrape this client&apos;s website and save content as knowledge articles.
              Re-scraping replaces previous import.
            </p>
            <div className="flex gap-2">
              <input
                value={scrapeUrl}
                onChange={e => setScrapeUrl(e.target.value)}
                placeholder="https://example.co.za"
                className="flex-1 px-3 py-2 rounded-xl border border-line bg-bg text-small text-fg placeholder:text-fg-faint focus:outline-none focus:ring-1 focus:ring-brand/40"
              />
              <button
                onClick={scrape}
                disabled={scraping || !scrapeUrl.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand text-white text-small font-semibold hover:bg-brand/90 disabled:opacity-50 transition-colors cursor-pointer"
              >
                {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {scraping ? "Scraping…" : "Scrape"}
              </button>
            </div>
            {scrapeMsg && (
              <p className={`text-tiny mt-2 font-medium ${scrapeMsg.ok ? "text-emerald-400" : "text-red-400"}`}>
                {scrapeMsg.msg}
              </p>
            )}
          </div>

          {/* Articles list */}
          {kb.length === 0 ? (
            <div className="text-center py-10 text-fg-muted text-small">
              <BookOpen className="w-8 h-8 mx-auto mb-3 text-fg-faint" />
              No knowledge articles yet.
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-bg-card overflow-hidden">
              {kb.map((a, i) => (
                <div key={a.id} className={`px-5 py-4 ${i > 0 ? "border-t border-line" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-small font-semibold text-fg">{a.title}</p>
                      <p className="text-[12px] text-fg-muted line-clamp-2 mt-0.5">{a.body}</p>
                      <p className="text-tiny text-fg-faint mt-1">Updated {timeAgo(a.updated_at)}</p>
                    </div>
                    {!a.is_active && (
                      <span className="shrink-0 text-tiny text-fg-faint bg-white/[0.04] px-2 py-0.5 rounded-full">Inactive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-fg-faint mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-tiny text-fg-faint">{label}</p>
        <p className="text-small text-fg">{value}</p>
      </div>
    </div>
  );
}
