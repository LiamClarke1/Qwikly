"use client";

export const dynamic = "force-dynamic";

import { useState } from "react";
import { Code2, ArrowRight, Copy, Check, Mail, MessageSquare, X, Send, Sparkles, PauseCircle, Clock } from "lucide-react";
import Link from "next/link";
import { useClient } from "@/lib/use-client";
import { EmbedActions } from "./_components/EmbedActions";

function SkeletonLine({ className }: { className?: string }) {
  return <div className={`rounded bg-ink/[0.07] animate-pulse ${className ?? ""}`} />;
}

function ChatPreview({ businessName }: { businessName: string }) {
  const [open, setOpen] = useState(false);
  const name = businessName || "Your Business";

  return (
    <div className="relative w-full bg-[#f8f9fb]" style={{ height: 580 }}>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-8 select-none">
        <div className="w-10 h-10 rounded-xl bg-ink/[0.06] flex items-center justify-center mb-1">
          <Sparkles className="w-5 h-5 text-ink-400" />
        </div>
        <p className="text-[15px] font-semibold text-ink text-center leading-snug">{name}</p>
        <p className="text-[13px] text-ink-400 text-center max-w-[200px] leading-relaxed">
          Professional service you can count on. Get a quote today.
        </p>
        <button className="px-5 py-2.5 bg-ink text-paper text-[13px] font-semibold rounded-xl cursor-default">
          Get a free quote
        </button>
        <p className="text-[11px] text-ink-300 mt-4">Click the chat button →</p>
      </div>

      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="absolute bottom-5 right-5 w-14 h-14 bg-ember rounded-full flex items-center justify-center shadow-lg hover:bg-ember-deep transition-colors duration-150 cursor-pointer"
          aria-label="Open chat"
        >
          <MessageSquare className="w-6 h-6 text-white" />
        </button>
      )}

      {open && (
        <div className="absolute bottom-5 right-5 w-[300px] rounded-2xl bg-white shadow-2xl border border-ink/[0.08] overflow-hidden flex flex-col">
          <div className="bg-ember px-4 py-3 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-white font-semibold text-[13px] leading-none">{name}</p>
                <p className="text-white/70 text-[11px] mt-0.5">Typically replies instantly</p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-3 space-y-3 bg-[#f8f9fb]" style={{ minHeight: 200, maxHeight: 260 }}>
            <div className="flex gap-2 items-end">
              <div className="w-6 h-6 rounded-full bg-ember/10 flex items-center justify-center shrink-0 mb-0.5">
                <Sparkles className="w-3 h-3 text-ember" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm text-[13px] text-ink max-w-[210px] leading-relaxed">
                Hi! I&apos;m {name}&apos;s digital assistant. How can I help you today?
              </div>
            </div>
            <div className="flex justify-end">
              <div className="bg-ember text-white rounded-2xl rounded-br-sm px-3 py-2 text-[13px] max-w-[190px] leading-relaxed">
                Do you service Sandton?
              </div>
            </div>
            <div className="flex gap-2 items-end">
              <div className="w-6 h-6 rounded-full bg-ember/10 flex items-center justify-center shrink-0 mb-0.5">
                <Sparkles className="w-3 h-3 text-ember" />
              </div>
              <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2 shadow-sm text-[13px] text-ink max-w-[210px] leading-relaxed">
                Yes, we cover Sandton and surrounding areas! Would you like to book a visit or get a quote?
              </div>
            </div>
          </div>

          <div className="p-3 border-t border-ink/[0.06] flex gap-2 shrink-0 bg-white">
            <input
              readOnly
              placeholder="Type a message…"
              className="flex-1 bg-ink/[0.04] border border-ink/[0.08] rounded-xl px-3 py-2 text-[13px] text-ink-400 outline-none cursor-default"
            />
            <button className="w-8 h-8 rounded-xl bg-ember flex items-center justify-center shrink-0 cursor-default">
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function EmbedPage() {
  const { client, loading } = useClient();

  const isLoading = loading;

  // Read plan from clients table — same source as the dashboard StatusBar
  const isTrialPlan = !client?.plan || client.plan === "trial";
  const trialEndsAt = client?.trial_ends_at ? new Date(client.trial_ends_at) : null;
  const now = new Date();
  const trialExpired = isTrialPlan && trialEndsAt !== null && trialEndsAt < now;
  const trialActive = isTrialPlan && trialEndsAt !== null && !trialExpired;
  const trialDaysLeft = trialActive
    ? Math.ceil((trialEndsAt!.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : 0;
  const trialUrgent = trialActive && trialDaysLeft <= 3;

  const publicKey = client?.public_key ?? "";
  const tenantName = client?.business_name ?? "Your Business";

  return (
    <div className="space-y-5 animate-fade-in">

      {/* Page header */}
      <div>
        <h1 className="text-h2 font-display text-ink font-bold tracking-tight">
          Install on your website
        </h1>
        <p className="text-small text-ink-500 mt-1">
          Paste this snippet before{" "}
          <code className="font-mono text-[13px] text-ink-600 bg-ink/[0.05] px-1 rounded">&lt;/body&gt;</code>{" "}
          on every page of your website to activate your digital assistant.
        </p>
      </div>

      {/* ── Trial expired: paused banner ── */}
      {!isLoading && trialExpired && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
              <PauseCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm font-semibold text-amber-900">Your digital assistant is paused</p>
              <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                Your 14-day trial has ended. Your assistant is off and visitors can&apos;t reach it. Your data and settings are safe. Pick a plan to reactivate.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/settings/billing"
            className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-amber-600 text-white text-sm font-semibold hover:bg-amber-700 transition-colors duration-150 cursor-pointer shrink-0"
          >
            Pick a plan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      )}

      {/* ── Trial active: info/warning banner ── */}
      {!isLoading && trialActive && (
        <div className={`rounded-2xl border p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          trialUrgent
            ? "border-amber-200 bg-amber-50"
            : "border-sky-200 bg-sky-50"
        }`}>
          <div className="flex items-center gap-3">
            <Clock className={`w-4 h-4 shrink-0 ${trialUrgent ? "text-amber-600" : "text-sky-600"}`} />
            <p className={`text-sm ${trialUrgent ? "text-amber-800" : "text-sky-800"}`}>
              <span className="font-semibold">
                {trialDaysLeft === 1 ? "1 day left" : `${trialDaysLeft} days left`} in your trial.
              </span>{" "}
              {trialUrgent
                ? "Add a plan now to keep your digital assistant running without interruption."
                : "Your assistant is live and fully active. Add a plan before your trial ends to keep it running."}
            </p>
          </div>
          <Link
            href="/dashboard/settings/billing"
            className={`inline-flex items-center gap-2 px-4 h-8 rounded-xl text-sm font-semibold transition-colors duration-150 cursor-pointer shrink-0 ${
              trialUrgent
                ? "bg-amber-600 text-white hover:bg-amber-700"
                : "bg-sky-600 text-white hover:bg-sky-700"
            }`}
          >
            View plans <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* LEFT: Snippet card */}
        <div className={`rounded-2xl bg-white border border-ink/[0.08] shadow-sm p-5 relative ${trialExpired ? "opacity-60" : ""}`}>
          {trialExpired && (
            <div className="absolute inset-0 rounded-2xl flex items-center justify-center z-10 bg-white/60 backdrop-blur-[1px]">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-100 border border-amber-200">
                <PauseCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-semibold text-amber-800">Assistant paused</span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-ember/10 flex items-center justify-center shrink-0">
              <Code2 className="w-4 h-4 text-ember" />
            </div>
            <h2 className="text-h3 font-semibold text-ink">Your snippet</h2>
          </div>
          <p className="text-tiny text-ink-400 mb-4 ml-[2.625rem]">
            1 line of HTML. Works on WordPress, Wix, Squarespace, and any custom site.
          </p>

          {isLoading ? (
            <div className="rounded-xl bg-[#0f172a] p-4 space-y-2">
              <SkeletonLine className="h-4 w-24 bg-white/10" />
              <SkeletonLine className="h-4 w-56 bg-white/10" />
              <SkeletonLine className="h-4 w-40 bg-white/10" />
              <SkeletonLine className="h-4 w-16 bg-white/10" />
              <SkeletonLine className="h-4 w-20 bg-white/10" />
            </div>
          ) : (
            <div className="rounded-xl bg-[#0f172a] p-4 overflow-x-auto">
              <pre className="font-mono text-[13px] leading-relaxed whitespace-pre">
                <span className="text-pink-400">&lt;script</span>
                {"\n"}{"  "}
                <span className="text-sky-300">src</span>
                <span className="text-slate-400">=</span>
                <span className="text-green-300">&quot;https://cdn.qwikly.co.za/embed.js&quot;</span>
                {"\n"}{"  "}
                <span className="text-sky-300">data-qwikly-id</span>
                <span className="text-slate-400">=</span>
                <span className="text-green-300">&quot;{publicKey}&quot;</span>
                {"\n"}{"  "}
                <span className="text-sky-300">async</span>
                {"\n"}
                <span className="text-pink-400">&gt;&lt;/script&gt;</span>
              </pre>
            </div>
          )}

          {!isLoading && (
            <EmbedActions publicKey={publicKey} tenantName={tenantName} />
          )}
        </div>

        {/* RIGHT: Preview card */}
        <div className="rounded-2xl bg-white border border-ink/[0.08] shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <MessageSquare className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-h3 font-semibold text-ink">Preview</h2>
          </div>
          <p className="text-tiny text-ink-400 mb-4 ml-[2.625rem]">
            Click the chat button to see how your visitors experience it.
          </p>

          <div className="rounded-xl border border-ink/[0.10] overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#e8e8e8] border-b border-ink/[0.08]">
              <div className="flex gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              <div className="flex-1 mx-2 px-3 py-1 rounded-md bg-white border border-ink/[0.10] text-[11px] text-ink-400 font-mono truncate">
                yourwebsite.co.za
              </div>
            </div>

            {isLoading ? (
              <div className="w-full bg-[#f8f9fb] animate-pulse" style={{ height: 580 }} />
            ) : (
              <ChatPreview businessName={tenantName} />
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
