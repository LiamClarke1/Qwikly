"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState } from "react";
import { Plus, Trash2, Copy, ExternalLink, Link2, Check } from "lucide-react";
import { PageHeader } from "@/components/ui/page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/empty";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/cn";

interface EmailLink {
  id: string;
  slug: string;
  destination_url: string;
  campaign: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_content: string | null;
  click_count: number;
  unique_clicks: number;
  created_at: string;
}

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.qwikly.co.za";

export default function EmailLinksPage() {
  const [links, setLinks] = useState<EmailLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/email-links")
      .then(r => r.json())
      .then(data => { setLinks(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const remove = async (link: EmailLink) => {
    if (!confirm(`Delete link qwikly.co.za/l/${link.slug}?`)) return;
    await fetch(`/api/email-links/${link.id}`, { method: "DELETE" });
    setLinks(l => l.filter(x => x.id !== link.id));
  };

  const copy = (slug: string) => {
    navigator.clipboard.writeText(`${BASE}/l/${slug}`);
    setCopied(slug);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <>
      <PageHeader
        title="Email links"
        description="Trackable links for emails and campaigns. Every click is counted."
        actions={
          <Button variant="primary" size="md" icon={<Plus className="w-4 h-4" />} onClick={() => setCreating(true)}>
            New link
          </Button>
        }
      />

      <div className="max-w-4xl space-y-3">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : links.length === 0 && !creating ? (
          <div className="py-16 text-center">
            <Link2 className="w-8 h-8 text-fg-faint mx-auto mb-3" />
            <p className="text-body font-semibold text-fg mb-1">No tracked links yet</p>
            <p className="text-small text-fg-muted mb-4">Create a link to start tracking clicks from your emails.</p>
            <Button variant="primary" onClick={() => setCreating(true)}>Create your first link</Button>
          </div>
        ) : (
          links.map(link => (
            <Card key={link.id} className="hover:border-line-strong transition-colors">
              <div className="flex items-start gap-4">
                <div className="w-9 h-9 rounded-xl bg-brand/10 flex items-center justify-center shrink-0">
                  <Link2 className="w-4 h-4 text-brand" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <p className="text-body font-semibold text-fg font-mono text-small">
                      qwikly.co.za/l/{link.slug}
                    </p>
                    {link.campaign && (
                      <Badge tone="neutral">{link.campaign}</Badge>
                    )}
                  </div>
                  <p className="text-tiny text-fg-muted truncate max-w-xs">{link.destination_url}</p>
                  <div className="flex items-center gap-4 mt-2 text-tiny text-fg-subtle">
                    <span><span className="text-fg font-semibold">{link.click_count}</span> clicks</span>
                    <span><span className="text-fg font-semibold">{link.unique_clicks}</span> unique</span>
                    {link.utm_source && <span>utm: {link.utm_source}/{link.utm_medium}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Copy link"
                    onClick={() => copy(link.slug)}
                  >
                    {copied === link.slug ? <Check className="w-4 h-4 text-success" /> : <Copy className="w-4 h-4" />}
                  </Button>
                  <a
                    href={link.destination_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg hover:bg-white/[0.06] text-fg-muted hover:text-fg transition-colors"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                  <Button variant="ghost" size="icon" onClick={() => remove(link)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {creating && (
        <CreateLinkModal
          onClose={() => setCreating(false)}
          onCreated={link => { setLinks(l => [link, ...l]); setCreating(false); }}
        />
      )}
    </>
  );
}

function CreateLinkModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (link: EmailLink) => void;
}) {
  const [destination, setDestination] = useState("");
  const [slug, setSlug] = useState("");
  const [campaign, setCampaign] = useState("");
  const [utmContent, setUtmContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async () => {
    setErr(null);
    if (!destination.trim()) return setErr("Destination URL is required.");
    try { new URL(destination); } catch { return setErr("Enter a valid URL (include https://)."); }
    setSaving(true);
    const res = await fetch("/api/email-links", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        destination_url: destination.trim(),
        slug: slug.trim() || undefined,
        campaign: campaign.trim() || undefined,
        utm_content: utmContent.trim() || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) return setErr(data.error ?? "Failed to create link.");
    onCreated(data as EmailLink);
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-black/60 animate-fade-in" />
      <div className="fixed inset-0 z-50 overflow-y-auto pointer-events-none">
        <div className="flex min-h-full items-center justify-center p-4 sm:p-6">
          <Card className="w-full max-w-md pointer-events-auto animate-slide-up">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-h2 text-fg">New tracked link</h2>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/[0.06] cursor-pointer">
                <Plus className="w-4 h-4 text-fg-muted rotate-45" />
              </button>
            </div>

            <div className="space-y-4">
              <Field label="Destination URL" hint="Where the link redirects to">
                <Input
                  value={destination}
                  onChange={e => setDestination(e.target.value)}
                  placeholder="https://yoursite.co.za/booking"
                  type="url"
                />
              </Field>
              <Field label="Custom slug (optional)" hint={`Short URL: qwikly.co.za/l/${slug || "auto-generated"}`}>
                <Input
                  value={slug}
                  onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
                  placeholder="e.g. june-promo"
                />
              </Field>
              <Field label="Campaign (optional)" hint="Used for filtering in analytics">
                <Input value={campaign} onChange={e => setCampaign(e.target.value)} placeholder="e.g. winter-special" />
              </Field>
              <Field label="UTM content (optional)" hint="Identifies which email or CTA this link is in">
                <Input value={utmContent} onChange={e => setUtmContent(e.target.value)} placeholder="e.g. header-cta" />
              </Field>
              {err && <p className="text-small text-danger">{err}</p>}
            </div>

            <div className="flex justify-end gap-2 mt-6 pt-5 border-t border-white/[0.06]">
              <Button variant="ghost" onClick={onClose}>Cancel</Button>
              <Button variant="primary" loading={saving} onClick={save}>Create link</Button>
            </div>
          </Card>
        </div>
      </div>
    </>
  );
}
