"use client";
import { useState, FormEvent } from "react";

export interface IntakeValues {
  websiteUrl: string;
  offer: string;
}

export function IntakeScreen({ onSubmit }: { onSubmit: (v: IntakeValues) => void }) {
  const [websiteUrl, setUrl] = useState("");
  const [offer, setOffer] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!websiteUrl.trim() || !offer.trim()) {
      setError("Both fields are required to build your lead engine.");
      return;
    }
    try {
      new URL(websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`);
    } catch {
      setError("That doesn't look like a valid website URL.");
      return;
    }
    onSubmit({
      websiteUrl: websiteUrl.startsWith("http") ? websiteUrl : `https://${websiteUrl}`,
      offer: offer.trim(),
    });
  }

  return (
    <form onSubmit={submit} className="max-w-xl mx-auto space-y-6 p-8">
      <header>
        <h1 className="font-display text-3xl text-ink-900">Build your lead engine</h1>
        <p className="text-ink-600 mt-2">
          Two answers, around 30 seconds. We&apos;ll read your website, look up your Google profile, and pre-fill the rest.
        </p>
      </header>

      <label className="block">
        <span className="text-small font-medium text-ink-800">Your website URL</span>
        <input
          type="text"
          value={websiteUrl}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://yourbusiness.co.za"
          className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 focus:border-ember focus:ring-1 focus:ring-ember"
        />
      </label>

      <label className="block">
        <span className="text-small font-medium text-ink-800">What do you do? One sentence.</span>
        <textarea
          value={offer}
          onChange={(e) => setOffer(e.target.value)}
          placeholder="We help solar installers in Cape Town book more inspections."
          rows={2}
          className="mt-1 w-full rounded-md border border-ink-300 px-3 py-2 focus:border-ember focus:ring-1 focus:ring-ember"
        />
      </label>

      {error && <p className="text-red-600 text-small">{error}</p>}

      <button
        type="submit"
        className="w-full rounded-md bg-ember px-4 py-2.5 text-white font-medium hover:bg-ember/90 cursor-pointer"
      >
        Build my ICP
      </button>
    </form>
  );
}
