"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, useRef, useCallback, FormEvent, ChangeEvent } from "react";
import {
  Save, Check, AlertCircle, User, Camera, Lock, Move,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Card, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { PageHeader } from "@/components/ui/page";

const TIMEZONES = [
  "Africa/Johannesburg",
  "Africa/Nairobi",
  "Africa/Lagos",
  "Africa/Cairo",
  "Europe/London",
  "Europe/Amsterdam",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
];

type Toast = { msg: string; tone: "success" | "danger" };

function useToast() {
  const [toast, setToast] = useState<Toast | null>(null);
  const show = (msg: string, tone: "success" | "danger" = "success") => {
    setToast({ msg, tone });
    setTimeout(() => setToast(null), 2500);
  };
  return { toast, show };
}

function isValidEmail(v: string) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v); }

export default function ProfilePage() {
  const { toast, show } = useToast();

  return (
    <>
      <PageHeader title="Profile" description="Your personal account and notification settings." />

      {toast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 panel-strong px-4 py-2.5 flex items-center gap-2 animate-slide-up">
          {toast.tone === "success"
            ? <Check className="w-4 h-4 text-success" />
            : <AlertCircle className="w-4 h-4 text-danger" />}
          <span className="text-small text-fg">{toast.msg}</span>
        </div>
      )}

      <div className="space-y-8">
        <AccountCard show={show} />
        <PasswordCard show={show} />
        <NotificationsCard show={show} />
      </div>
    </>
  );
}

// ─── Account card ─────────────────────────────────────────────────────────────

function AccountCard({ show }: { show: (msg: string, tone?: "success" | "danger") => void }) {
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<{ email?: string; user_metadata?: Record<string, string> } | null>(null);
  const [form, setForm] = useState({ full_name: "", timezone: "Africa/Johannesburg" });
  const [saving, setSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      const u = data.session?.user ?? null;
      setUser(u);
      setForm({
        full_name: u?.user_metadata?.full_name ?? u?.user_metadata?.name ?? "",
        timezone: u?.user_metadata?.timezone ?? "Africa/Johannesburg",
      });
      setPhotoUrl(u?.user_metadata?.avatar_url ?? null);
      setAuthLoading(false);
    });
  }, []);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.auth.updateUser({
      data: { full_name: form.full_name, timezone: form.timezone },
    });
    setSaving(false);
    if (error) show(error.message, "danger");
    else show("Profile saved");
  };

  const uploadPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { show("Photo must be under 10 MB", "danger"); return; }
    setPhotoUploading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { setPhotoUploading(false); return; }
    const path = `avatars/${u.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (upErr) { show(upErr.message, "danger"); setPhotoUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    await supabase.from("clients").update({ profile_photo_url: publicUrl }).eq("auth_user_id", u.id);
    setPhotoUrl(publicUrl);
    setPhotoUploading(false);
    show("Photo updated");
  };

  const saveAdjusted = async (blob: Blob) => {
    setPhotoUploading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { setPhotoUploading(false); return; }
    const path = `avatars/${u.id}/${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, blob, { upsert: true, contentType: "image/jpeg" });
    if (upErr) { show(upErr.message, "danger"); setPhotoUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
    await supabase.from("clients").update({ profile_photo_url: publicUrl }).eq("auth_user_id", u.id);
    setPhotoUrl(publicUrl);
    setPhotoUploading(false);
    show("Photo updated");
  };

  if (authLoading) {
    return (
      <Card>
        <div className="animate-pulse space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-surface-input shrink-0" />
            <div className="space-y-2">
              <div className="h-8 w-32 bg-surface-input rounded-lg" />
              <div className="h-3 w-24 bg-surface-input rounded-lg" />
            </div>
          </div>
          <div className="h-10 bg-surface-input rounded-xl" />
          <div className="h-10 bg-surface-input rounded-xl" />
          <div className="h-10 bg-surface-input rounded-xl" />
          <div className="h-9 w-28 bg-surface-input rounded-xl" />
        </div>
      </Card>
    );
  }

  return (
    <>
      {adjustOpen && photoUrl && (
        <AdjustPhotoModal
          photoUrl={photoUrl}
          onClose={() => setAdjustOpen(false)}
          onSave={(blob) => {
            setAdjustOpen(false);
            saveAdjusted(blob);
          }}
        />
      )}

      <Card>
        <CardHeader title="Your account" description="Name, email, and profile photo." />

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative w-16 h-16 rounded-2xl bg-surface-input border border-[var(--border)] overflow-hidden shrink-0">
            {photoUrl
              ? <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              : <div className="w-full h-full flex items-center justify-center"><User className="w-6 h-6 text-fg-muted" /></div>}
            {photoUploading && (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-2 h-8 px-3 text-small font-medium rounded-lg bg-surface-input border border-[var(--border-strong)] text-fg hover:bg-surface-active transition-colors cursor-pointer">
                  <Camera className="w-3.5 h-3.5" /> Change photo
                </span>
                <input type="file" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" className="sr-only" onChange={uploadPhoto} />
              </label>
              {photoUrl && (
                <button
                  type="button"
                  onClick={() => setAdjustOpen(true)}
                  className="inline-flex items-center gap-2 h-8 px-3 text-small font-medium rounded-lg bg-surface-input border border-[var(--border-strong)] text-fg hover:bg-surface-active transition-colors"
                >
                  <Move className="w-3.5 h-3.5" /> Adjust
                </button>
              )}
            </div>
            <p className="text-tiny text-fg-muted mt-1">JPG, PNG, SVG or WebP, max 10 MB</p>
          </div>
        </div>

        <form className="space-y-4" onSubmit={save}>
          <Field label="Email">
            <Input value={user?.email ?? ""} disabled className="opacity-60 cursor-not-allowed" />
          </Field>
          <Field label="Display name" hint="Shown in your dashboard greeting.">
            <Input
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              placeholder="Your name"
            />
          </Field>
          <Field label="Time zone">
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full bg-surface-input border border-[var(--border)] rounded-xl px-4 py-2.5 text-body text-fg outline-none focus:border-ember/40 focus:ring-2 focus:ring-ember/10 transition-colors duration-150 hover:border-[var(--border-strong)] cursor-pointer appearance-none"
              style={{
                backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236A6A63' stroke-width='2'><polyline points='6 9 12 15 18 9'/></svg>\")",
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 14px center",
              }}
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz.replace("_", " ")}</option>
              ))}
            </select>
          </Field>
          <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>Save profile</Button>
        </form>
      </Card>
    </>
  );
}

// ─── Adjust photo modal ───────────────────────────────────────────────────────

const PREVIEW_SIZE = 240;

function AdjustPhotoModal({
  photoUrl,
  onClose,
  onSave,
}: {
  photoUrl: string;
  onClose: () => void;
  onSave: (blob: Blob) => void;
}) {
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [saving, setSaving] = useState(false);
  const dragRef = useRef<{ active: boolean; lastX: number; lastY: number }>({ active: false, lastX: 0, lastY: 0 });
  const previewRef = useRef<HTMLDivElement>(null);

  const baseScale = imgDims
    ? Math.max(PREVIEW_SIZE / imgDims.w, PREVIEW_SIZE / imgDims.h)
    : 1;
  const scale = baseScale * zoom;

  const clampOffset = useCallback(
    (o: { x: number; y: number }, s: number, dims: { w: number; h: number } | null) => {
      if (!dims) return o;
      const maxX = Math.max(0, (dims.w * s - PREVIEW_SIZE) / 2);
      const maxY = Math.max(0, (dims.h * s - PREVIEW_SIZE) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, o.x)),
        y: Math.max(-maxY, Math.min(maxY, o.y)),
      };
    },
    []
  );

  const applyDelta = useCallback(
    (dx: number, dy: number) => {
      setOffset((prev) => clampOffset({ x: prev.x + dx, y: prev.y + dy }, scale, imgDims));
    },
    [scale, imgDims, clampOffset]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { active: true, lastX: e.clientX, lastY: e.clientY };
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0];
    dragRef.current = { active: true, lastX: t.clientX, lastY: t.clientY };
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!dragRef.current.active) return;
      applyDelta(e.clientX - dragRef.current.lastX, e.clientY - dragRef.current.lastY);
      dragRef.current.lastX = e.clientX;
      dragRef.current.lastY = e.clientY;
    };
    const onMouseUp = () => { dragRef.current.active = false; };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, [applyDelta]);

  useEffect(() => {
    const el = previewRef.current;
    if (!el) return;
    const onTouchMove = (e: TouchEvent) => {
      if (!dragRef.current.active) return;
      e.preventDefault();
      const t = e.touches[0];
      applyDelta(t.clientX - dragRef.current.lastX, t.clientY - dragRef.current.lastY);
      dragRef.current.lastX = t.clientX;
      dragRef.current.lastY = t.clientY;
    };
    const onTouchEnd = () => { dragRef.current.active = false; };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);
    return () => {
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [applyDelta]);

  const handleZoom = (e: ChangeEvent<HTMLInputElement>) => {
    const z = parseFloat(e.target.value);
    setZoom(z);
    if (imgDims) {
      const newScale = Math.max(PREVIEW_SIZE / imgDims.w, PREVIEW_SIZE / imgDims.h) * z;
      setOffset((prev) => clampOffset(prev, newScale, imgDims));
    }
  };

  const handleSave = () => {
    if (!imgDims) return;
    setSaving(true);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const OUT = 400;
      const canvas = document.createElement("canvas");
      canvas.width = OUT;
      canvas.height = OUT;
      const ctx = canvas.getContext("2d")!;
      ctx.beginPath();
      ctx.arc(OUT / 2, OUT / 2, OUT / 2, 0, Math.PI * 2);
      ctx.clip();
      const r = OUT / PREVIEW_SIZE;
      const drawW = imgDims.w * scale * r;
      const drawH = imgDims.h * scale * r;
      const drawX = OUT / 2 + offset.x * r - drawW / 2;
      const drawY = OUT / 2 + offset.y * r - drawH / 2;
      ctx.drawImage(img, drawX, drawY, drawW, drawH);
      canvas.toBlob((blob) => {
        setSaving(false);
        if (blob) onSave(blob);
      }, "image/jpeg", 0.9);
    };
    img.onerror = () => setSaving(false);
    img.src = photoUrl;
  };

  const imgW = imgDims ? imgDims.w * scale : 0;
  const imgH = imgDims ? imgDims.h * scale : 0;
  const imgX = PREVIEW_SIZE / 2 + offset.x - imgW / 2;
  const imgY = PREVIEW_SIZE / 2 + offset.y - imgH / 2;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl shadow-xl p-6 w-80 flex flex-col items-center gap-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <h3 className="text-body font-semibold text-fg">Adjust photo</h3>
          <p className="text-tiny text-fg-muted mt-0.5">Drag to reposition, slider to zoom</p>
        </div>

        {/* Circular preview */}
        <div
          ref={previewRef}
          className="relative overflow-hidden rounded-full bg-surface-input border-2 border-[var(--border)] cursor-grab active:cursor-grabbing select-none"
          style={{ width: PREVIEW_SIZE, height: PREVIEW_SIZE }}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
        >
          {/* Hidden img to capture natural dimensions */}
          {!imgDims && (
            <img
              src={photoUrl}
              alt=""
              className="sr-only"
              onLoad={(e) => {
                const t = e.currentTarget;
                setImgDims({ w: t.naturalWidth, h: t.naturalHeight });
              }}
            />
          )}
          {imgDims && (
            <img
              src={photoUrl}
              alt="Adjust"
              draggable={false}
              style={{
                position: "absolute",
                width: imgW,
                height: imgH,
                left: imgX,
                top: imgY,
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          )}
          {!imgDims && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-6 h-6 border-2 border-[var(--border)] border-t-ember rounded-full animate-spin" />
            </div>
          )}
        </div>

        {/* Zoom slider */}
        <div className="w-full space-y-1.5">
          <div className="flex justify-between text-tiny text-fg-muted">
            <span>Zoom</span>
            <span>{zoom.toFixed(2)}x</span>
          </div>
          <input
            type="range"
            min="1"
            max="3"
            step="0.05"
            value={zoom}
            onChange={handleZoom}
            className="w-full accent-ember"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-3 w-full">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-9 rounded-xl border border-[var(--border-strong)] text-small font-medium text-fg-muted hover:bg-surface-active transition-colors"
          >
            Cancel
          </button>
          <div className="flex-1">
            <Button
              type="button"
              loading={saving}
              onClick={handleSave}
              icon={<Check className="w-4 h-4" />}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Password card ────────────────────────────────────────────────────────────

function PasswordCard({ show }: { show: (msg: string, tone?: "success" | "danger") => void }) {
  const [form, setForm] = useState({ password: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({});

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (form.password.length < 8) errs.password = "Must be at least 8 characters";
    if (form.password !== form.confirm) errs.confirm = "Passwords don't match";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: form.password });
    setSaving(false);
    if (error) show(error.message, "danger");
    else { show("Password updated"); setForm({ password: "", confirm: "" }); setErrors({}); }
  };

  return (
    <Card>
      <CardHeader title="Change password" description="Must be at least 8 characters." />
      <form className="space-y-4" onSubmit={save}>
        <Field label="New password" error={errors.password}>
          <Input
            type="password"
            value={form.password}
            onChange={(e) => { setForm({ ...form, password: e.target.value }); setErrors({ ...errors, password: undefined }); }}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirm password" error={errors.confirm}>
          <Input
            type="password"
            value={form.confirm}
            onChange={(e) => { setForm({ ...form, confirm: e.target.value }); setErrors({ ...errors, confirm: undefined }); }}
            autoComplete="new-password"
            placeholder="••••••••"
          />
        </Field>
        <Button type="submit" loading={saving} icon={<Lock className="w-4 h-4" />}>Update password</Button>
      </form>
    </Card>
  );
}

// ─── Notifications card ───────────────────────────────────────────────────────
// Lead alert preferences live on the businesses table (v2 widget backend).
// The legacy clients.notification_email / clients.notification_phone fields
// are not read by /api/leads, so writing there silently did nothing.

function NotificationsCard({
  show,
}: {
  show: (msg: string, tone?: "success" | "danger") => void;
}) {
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    notification_email: "",
    lead_emails_enabled: true,
  });
  const [defaultEmail, setDefaultEmail] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [errors, setErrors] = useState<{ email?: string }>({});

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/business", { cache: "no-store" });
        if (!alive) return;
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          const detail = body.message || body.error || `HTTP ${res.status}`;
          show(`Couldn't load notification settings: ${detail}`, "danger");
          setLoading(false);
          return;
        }
        const data = await res.json();
        setForm({
          notification_email: data.notification_email ?? data.contact_email ?? "",
          lead_emails_enabled: data.lead_emails_enabled !== false,
        });
        setDefaultEmail(data.contact_email ?? "");
      } catch (err) {
        const msg = err instanceof Error ? err.message : "network error";
        show(`Couldn't load notification settings: ${msg}`, "danger");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [show]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (form.notification_email && !isValidEmail(form.notification_email)) {
      errs.email = "Enter a valid email address";
    }
    if (form.lead_emails_enabled && !form.notification_email) {
      errs.email = "Add an address to send lead alerts to, or turn alerts off.";
    }
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    const res = await fetch("/api/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notification_email: form.notification_email || null,
        lead_emails_enabled: form.lead_emails_enabled,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      const { error } = await res.json().catch(() => ({ error: "save_failed" }));
      show(error || "Couldn't save", "danger");
      return;
    }
    show("Notifications saved");
    setErrors({});
  };

  const sendTest = async () => {
    if (form.notification_email && !isValidEmail(form.notification_email)) {
      setErrors({ email: "Enter a valid email address first" });
      return;
    }
    setTesting(true);
    const res = await fetch("/api/leads/test-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(
        form.notification_email ? { override_recipient: form.notification_email } : {}
      ),
    });
    setTesting(false);
    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      show(body.message || body.error || "Test send failed", "danger");
      return;
    }
    show(`Test lead created and email sent to ${body.recipient}`);
  };

  if (loading) {
    return (
      <Card>
        <CardHeader title="Lead alerts" description="Loading..." />
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title="Lead alerts"
        description="Get an email the moment your assistant captures a new lead."
      />

      <form className="space-y-5" onSubmit={save}>
        {/* On/off toggle */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="text-small font-medium text-fg">Email me when a new lead comes in</div>
            <div className="text-mini text-fg-muted mt-1">
              Turn this off to stop all lead notification emails. Leads still get captured in your dashboard.
            </div>
          </div>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, lead_emails_enabled: !f.lead_emails_enabled }))}
            role="switch"
            aria-checked={form.lead_emails_enabled}
            aria-label="Toggle lead notification emails"
            className={`relative w-12 h-6 rounded-full transition-colors duration-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ember/40 shrink-0 mt-0.5 ${
              form.lead_emails_enabled ? "bg-ember" : "bg-ink/20"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-5 h-5 bg-paper rounded-full shadow-sm transition-transform duration-200 ${
                form.lead_emails_enabled ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        <Field
          label="Send lead alerts to"
          hint={
            defaultEmail && form.notification_email !== defaultEmail
              ? `Default account email is ${defaultEmail}. Leave blank to use it.`
              : "This is the inbox where every new lead will land."
          }
          error={errors.email}
        >
          <Input
            type="email"
            value={form.notification_email}
            onChange={(e) => {
              setForm({ ...form, notification_email: e.target.value });
              setErrors({ ...errors, email: undefined });
            }}
            placeholder="you@business.co.za"
            disabled={!form.lead_emails_enabled}
          />
        </Field>

        <div className="flex flex-wrap gap-3 pt-1">
          <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>
            Save changes
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={sendTest}
            loading={testing}
            disabled={!form.notification_email && !defaultEmail}
          >
            Send test lead
          </Button>
        </div>

        <p className="text-mini text-fg-muted">
          The test runs the full pipeline: it creates a real lead in your dashboard and sends the alert email. Limited to 4 sends per minute. If nothing arrives, check spam first.
        </p>
      </form>
    </Card>
  );
}
