"use client";

export const dynamic = "force-dynamic";

import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import {
  Save, Check, AlertCircle, User, Camera, Lock,
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useClient } from "@/lib/use-client";
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
function isValidPhone(v: string) { return /^[+\d\s\-()]{7,20}$/.test(v); }

export default function ProfilePage() {
  const { toast, show } = useToast();
  const { client, setClient } = useClient();

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
        {client && (
          <NotificationsCard
            client={client}
            show={show}
            onSave={(patch) => setClient({ ...client, ...patch })}
          />
        )}
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
    if (file.size > 2 * 1024 * 1024) { show("Photo must be under 2 MB", "danger"); return; }
    setPhotoUploading(true);
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { setPhotoUploading(false); return; }
    const path = `avatars/${u.id}/${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("media").upload(path, file, { upsert: true });
    if (upErr) { show(upErr.message, "danger"); setPhotoUploading(false); return; }
    const { data: { publicUrl } } = supabase.storage.from("media").getPublicUrl(path);
    await supabase.auth.updateUser({ data: { avatar_url: publicUrl } });
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
          <label className="cursor-pointer">
            <span className="inline-flex items-center gap-2 h-8 px-3 text-small font-medium rounded-lg bg-surface-input border border-[var(--border-strong)] text-fg hover:bg-surface-active transition-colors cursor-pointer">
              <Camera className="w-3.5 h-3.5" /> Change photo
            </span>
            <input type="file" accept="image/*" className="sr-only" onChange={uploadPhoto} />
          </label>
          <p className="text-tiny text-fg-muted mt-1">JPG, PNG or WebP, max 2 MB</p>
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

type ClientPatch = { notification_email?: string | null; notification_phone?: string | null };

function NotificationsCard({
  client,
  show,
  onSave,
}: {
  client: { id: string; notification_email?: string | null; notification_phone?: string | null };
  show: (msg: string, tone?: "success" | "danger") => void;
  onSave: (patch: ClientPatch) => void;
}) {
  const [form, setForm] = useState({
    notification_email: client.notification_email ?? "",
    notification_phone: client.notification_phone ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; phone?: string }>({});

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const errs: typeof errors = {};
    if (form.notification_email && !isValidEmail(form.notification_email)) errs.email = "Enter a valid email address";
    if (form.notification_phone && !isValidPhone(form.notification_phone)) errs.phone = "Enter a valid phone number (e.g. +27 82 123 4567)";
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setSaving(true);
    const { error } = await supabase
      .from("clients")
      .update(form)
      .eq("id", client.id);
    setSaving(false);
    if (error) show(error.message, "danger");
    else { onSave(form); show("Notifications saved"); setErrors({}); }
  };

  return (
    <Card>
      <CardHeader title="Notifications" description="Where to alert you when a lead needs attention." />
      <form className="space-y-4" onSubmit={save}>
        <Field label="Email" hint="Daily summaries, escalations, and no-shows." error={errors.email}>
          <Input
            type="email"
            value={form.notification_email}
            onChange={(e) => { setForm({ ...form, notification_email: e.target.value }); setErrors({ ...errors, email: undefined }); }}
            placeholder="you@business.co.za"
          />
        </Field>
        <Field label="WhatsApp number" hint="Urgent escalations only." error={errors.phone}>
          <Input
            value={form.notification_phone}
            onChange={(e) => { setForm({ ...form, notification_phone: e.target.value }); setErrors({ ...errors, phone: undefined }); }}
            placeholder="+27 82 123 4567"
          />
        </Field>
        <Button type="submit" loading={saving} icon={<Save className="w-4 h-4" />}>Save notifications</Button>
      </form>
    </Card>
  );
}
