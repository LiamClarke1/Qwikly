"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft, Globe, BookOpen, User, Mail, Phone,
  CheckCircle2, Clock, RefreshCw, Loader2, Globe2, MessageSquare,
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
    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
    : channel === "email"
    ? "bg-blue-50 text-blue-700 border-blue-200"
    : "bg-violet-50 text-violet-700 border-violet-200";
  return (
    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium border ${cls}`}>{label}</span>
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
    <div className="space-y-4">
      <div className="h-8 w-48 rounded-xl bg-slate-100 animate-pulse" />
      <div className="h-32 rounded-2xl bg-slate-100 animate-pulse" />
    </div>
  );

  if (!client) return (
    <div className="text-center py-20 text-slate-400 text-[13px]">Client not found.</div>
  );

  const statusOk = client.web_widget_status === "verified";

  return (
    <div className="max-w-5xl">
      <Link href="/admin/clients" className="inline-flex items-center gap-1.5 text-[13px] text-slate-500 hover:text-slate-800 mb-6 cursor-pointer transition-colors">
        <ArrowLeft className="w-4 h-4" /> All clients
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[28px] font-bold text-slate-900 leading-tight">{client.business_name ?? "Unnamed"}</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">{client.trade ?? "No trade set"}</p>
        </div>
        <div className="shrink-0">
          {statusOk ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[13px] font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" /> Live
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[13px] font-medium">
              <Clock className="w-3.5 h-3.5" /> {client.onboarding_complete ? "Active" : "Setup"}
            </span>
          )}
        </div>
      </div>

      {/* Stat strip */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {[
          { label: "Conversations", value: conversations.length.toString() },
          { label: "Knowledge articles", value: kb.length.toString() },
          { label: "Joined", value: timeAgo(client.created_at) },
        ].map(s => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm">
            <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1">{s.label}</p>
            <p className="text-[20px] font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-0 mb-6 border-b border-slate-200">
        {TABS.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-[13px] font-medium transition-colors cursor-pointer border-b-2 -mb-px ${
              tab === t ? "border-[#E85A2C] text-[#E85A2C]" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Overview */}
      {tab === "Overview" && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-sm">
            <p className="text-[13px] font-semibold text-slate-800">Business info</p>
            <InfoRow icon={<User className="w-4 h-4" />} label="Owner" value={client.owner_name} />
            <InfoRow icon={<Mail className="w-4 h-4" />} label="Email" value={client.client_email} />
            <InfoRow icon={<Phone className="w-4 h-4" />} label="WhatsApp" value={client.whatsapp_number} />
            <InfoRow icon={<Globe className="w-4 h-4" />} label="Domain" value={client.web_widget_domain} />
            {client.address && <InfoRow icon={<Globe2 className="w-4 h-4" />} label="Address" value={client.address} />}
          </div>
          <div className="space-y-4">
            {client.services_offered && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-2">Services</p>
                <p className="text-[13px] text-slate-600 leading-relaxed">{client.services_offered}</p>
              </div>
            )}
            {client.unique_selling_point && (
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-2">USP</p>
                <p className="text-[13px] text-slate-600 leading-relaxed">{client.unique_selling_point}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Conversations */}
      {tab === "Conversations" && (
        <div>
          {conversations.length === 0 ? (
            <div className="text-center py-16 text-slate-400 text-[13px]">No conversations yet.</div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {conversations.map((c, i) => (
                <div key={c.id} className={`px-5 py-4 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-[13px] font-semibold text-slate-800">{c.customer_name ?? "Visitor"}</p>
                        <ChannelBadge channel={c.channel} />
                        <span className="text-[11px] text-slate-400">{timeAgo(c.created_at)}</span>
                      </div>
                      {c.summary && <p className="text-[12px] text-slate-500 mt-0.5 line-clamp-2">{c.summary}</p>}
                      {c.intent && (
                        <p className="text-[11px] text-slate-400 mt-1">
                          <span className="text-[#E85A2C] font-medium">Intent:</span> {c.intent}
                        </p>
                      )}
                    </div>
                    {c.email && <p className="shrink-0 text-[11px] text-slate-400">{c.email}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Knowledge */}
      {tab === "Knowledge" && (
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <p className="text-[13px] font-semibold text-slate-800 mb-1 flex items-center gap-2">
              <Globe className="w-4 h-4 text-[#E85A2C]" />
              Import from website
            </p>
            <p className="text-[12px] text-slate-500 mb-4">
              Scrape this client&apos;s website and save content as knowledge articles. Re-scraping replaces the previous import.
            </p>
            <div className="flex gap-2">
              <input
                value={scrapeUrl}
                onChange={e => setScrapeUrl(e.target.value)}
                placeholder="https://example.co.za"
                className="flex-1 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 text-[13px] text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#E85A2C]/20 focus:border-[#E85A2C]/40"
              />
              <button
                onClick={scrape}
                disabled={scraping || !scrapeUrl.trim()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#E85A2C] text-white text-[13px] font-semibold hover:bg-[#d04f25] disabled:opacity-50 transition-colors cursor-pointer"
              >
                {scraping ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                {scraping ? "Scraping…" : "Scrape"}
              </button>
            </div>
            {scrapeMsg && (
              <p className={`text-[12px] mt-2 font-medium ${scrapeMsg.ok ? "text-emerald-600" : "text-red-500"}`}>
                {scrapeMsg.msg}
              </p>
            )}
          </div>

          {kb.length === 0 ? (
            <div className="text-center py-10 text-slate-400 text-[13px]">
              <BookOpen className="w-8 h-8 mx-auto mb-3 text-slate-300" />
              No knowledge articles yet.
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              {kb.map((a, i) => (
                <div key={a.id} className={`px-5 py-4 ${i > 0 ? "border-t border-slate-100" : ""}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-slate-800">{a.title}</p>
                      <p className="text-[12px] text-slate-500 line-clamp-2 mt-0.5">{a.body}</p>
                      <p className="text-[11px] text-slate-400 mt-1">Updated {timeAgo(a.updated_at)}</p>
                    </div>
                    {!a.is_active && (
                      <span className="shrink-0 text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">Inactive</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Floating conversation count */}
      {tab === "Conversations" && conversations.length > 0 && (
        <div className="mt-4 flex items-center gap-2 text-[12px] text-slate-400">
          <MessageSquare className="w-3.5 h-3.5" />
          Showing {conversations.length} most recent conversations
        </div>
      )}
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex items-start gap-3">
      <span className="text-slate-400 mt-0.5 shrink-0">{icon}</span>
      <div>
        <p className="text-[11px] text-slate-400">{label}</p>
        <p className="text-[13px] text-slate-800">{value}</p>
      </div>
    </div>
  );
}
