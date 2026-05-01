"use client";

export const dynamic = "force-dynamic";

import { Code2, Globe } from "lucide-react";
import { useClient } from "@/lib/use-client";
import { EmbedActions } from "./_components/EmbedActions";

function SkeletonLine({ className }: { className?: string }) {
  return (
    <div className={`rounded bg-ink/[0.07] animate-pulse ${className ?? ""}`} />
  );
}

export default function EmbedPage() {
  const { client, loading } = useClient();

  const publicKey = client?.public_key ?? "";
  const tenantName = client?.business_name ?? "Your business";

  return (
    <div className="space-y-6 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-h2 font-display text-ink font-bold tracking-tight">
          Get embed code
        </h1>
        <p className="text-small text-ink-500 mt-1">
          Drop this snippet on any website to activate your digital assistant.
        </p>
      </div>

      {/* ── Two-column grid ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

        {/* ── LEFT: Snippet card ─────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-ink/[0.08] shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-ember/10 flex items-center justify-center shrink-0">
              <Code2 className="w-4 h-4 text-ember" />
            </div>
            <h2 className="text-h3 font-semibold text-ink">Your embed snippet</h2>
          </div>
          <p className="text-tiny text-ink-400 mb-4 ml-[2.625rem]">
            1 line of HTML. Paste it before{" "}
            <code className="font-mono text-ink-600 bg-ink/[0.05] px-1 rounded">&lt;/body&gt;</code>{" "}
            on any page.
          </p>

          {/* Dark code block */}
          {loading ? (
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
                {"\n"}
                {"  "}
                <span className="text-sky-300">src</span>
                <span className="text-ink-400">=</span>
                <span className="text-green-300">&quot;https://cdn.qwikly.co.za/embed.js&quot;</span>
                {"\n"}
                {"  "}
                <span className="text-sky-300">data-qwikly-id</span>
                <span className="text-ink-400">=</span>
                <span className="text-green-300">&quot;{publicKey}&quot;</span>
                {"\n"}
                {"  "}
                <span className="text-sky-300">async</span>
                {"\n"}
                <span className="text-pink-400">&gt;&lt;/script&gt;</span>
              </pre>
            </div>
          )}

          {/* Buttons + platform tags */}
          {!loading && (
            <EmbedActions publicKey={publicKey} tenantName={tenantName} />
          )}
        </div>

        {/* ── RIGHT: Live preview card ────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-ink/[0.08] shadow-sm p-5">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 rounded-xl bg-green-500/10 flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4 text-green-600" />
            </div>
            <h2 className="text-h3 font-semibold text-ink">Live preview</h2>
          </div>
          <p className="text-tiny text-ink-400 mb-4 ml-[2.625rem]">
            Exactly how your widget looks to visitors.
          </p>

          {/* Browser chrome mockup */}
          <div className="rounded-xl border border-ink/[0.10] overflow-hidden bg-[#f8f9fa]">
            {/* Chrome bar */}
            <div className="flex items-center gap-2 px-3 py-2.5 bg-[#e8e8e8] border-b border-ink/[0.08]">
              {/* Window dots */}
              <div className="flex gap-1.5 shrink-0">
                <div className="w-2.5 h-2.5 rounded-full bg-[#FF5F57]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#FEBC2E]" />
                <div className="w-2.5 h-2.5 rounded-full bg-[#28C840]" />
              </div>
              {/* Fake URL bar */}
              <div className="flex-1 mx-2 px-3 py-1 rounded-md bg-white border border-ink/[0.10] text-[11px] text-ink-400 font-mono truncate">
                yourwebsite.co.za
              </div>
            </div>

            {/* iframe */}
            {loading ? (
              <div className="w-full bg-white animate-pulse" style={{ height: 660 }} />
            ) : (
              <iframe
                src={`/embed/preview?key=${publicKey}`}
                title="Widget preview"
                style={{ border: "none", width: "100%", height: 660 }}
              />
            )}
          </div>

          {/* Status indicator */}
          <div className="flex items-center gap-2 mt-3 ml-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse shrink-0" />
            <span className="text-tiny text-ink-500 font-medium">
              Widget verified and live
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
