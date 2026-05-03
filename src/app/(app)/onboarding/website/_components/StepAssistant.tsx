"use client";

import { useState } from "react";
import { ClientRow } from "@/lib/use-client";
import { Loader2, Plus, Trash2, Lock } from "lucide-react";
import { Input, Textarea, Field } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WidgetPreview } from "./WidgetPreview";
import { type PlanTier } from "@/lib/plan";
import { saveAssistantStep } from "../actions";

// ─── Industry default greetings ───────────────────────────────────────────────

const INDUSTRY_GREETINGS: Record<string, string> = {
  "restaurant / café":          "Hi! Welcome to {business}. Looking to make a reservation or order online?",
  "hair & beauty salon":        "Hi! I'm {business}'s booking assistant. Want to book a treatment or ask about availability?",
  "gym / fitness studio":       "Hi! Welcome to {business}. Interested in a membership or class booking?",
  "medical / dental clinic":    "Hi! I'm {business}'s assistant. Need to book an appointment or ask about our services?",
  "contractor / trades":        "Hi! I'm {business}'s booking assistant. What job can we help you with today?",
  "electrician":                "Hi! I'm {business}'s booking assistant. Electrical fault, install, or quote needed?",
  "plumber":                    "Hi! I'm {business}'s booking assistant. Burst pipe, leak, or install job?",
  "landscaper":                 "Hi! Welcome to {business}. Looking for a garden quote or maintenance plan?",
  "cleaning service":           "Hi! I'm {business}'s booking assistant. Need a once-off clean or regular service?",
  "pest control":               "Hi! I'm {business}'s booking assistant. What pest problem can we help with?",
  "pool care":                  "Hi! Welcome to {business}. Need a pool service or chemical quote?",
  "solar installer":            "Hi! I'm {business}'s assistant. Interested in solar or having system issues?",
  "coffee shop":                "Hi! Welcome to {business}. Want to reserve a table or ask about our menu?",
};

const INDUSTRY_QUESTIONS: Record<string, string[]> = {
  "restaurant / café":       ["How many guests?", "Any dietary requirements?", "What date and time works for you?"],
  "hair & beauty salon":     ["What service are you looking for?", "Have you been with us before?", "What date and time suits you?"],
  "gym / fitness studio":    ["Which membership or class are you interested in?", "Are you a current member?", "Best time to call you back?"],
  "medical / dental clinic": ["What is the reason for your visit?", "Is this a new or returning patient?", "Do you have a preferred date?"],
  "contractor / trades":     ["What's the job you need done?", "What area are you in?", "When would you like us to come by?"],
  "electrician":             ["What's the electrical issue?", "What suburb are you in?", "When is a good time for us to come?"],
  "plumber":                 ["What's the plumbing issue?", "How urgent is it?", "What suburb are you in?"],
  "landscaper":              ["What type of garden work do you need?", "Roughly how big is your property?", "When would you like a quote?"],
  "cleaning service":        ["Is this for a home or business?", "Roughly how large is the space?", "When would you like us to start?"],
  "pest control":            ["What pest problem are you dealing with?", "Is this a once-off or recurring issue?", "What suburb are you in?"],
  "pool care":               ["Is your pool heated or unheated?", "How often do you need it serviced?", "What area are you in?"],
};

const DEFAULT_GREETING = "Hi! Welcome to {business}. How can I help you today?";
const DEFAULT_QUESTIONS = [
  "What can we help you with?",
  "What is your preferred contact method?",
  "When would be a good time to get back to you?",
];

interface Props {
  client: ClientRow;
  plan: PlanTier;
  onAdvance: () => Promise<void>;
  onBack: () => void;
  refresh: () => Promise<void>;
}

export default function StepAssistant({ client, plan, onAdvance, onBack }: Props) {
  const industryKey = (client.industry ?? "").toLowerCase();

  const [color, setColor] = useState(client.web_widget_color ?? "#E85A2C");
  const [greeting, setGreeting] = useState(
    client.web_widget_greeting ?? INDUSTRY_GREETINGS[industryKey] ?? DEFAULT_GREETING
  );
  const [questions, setQuestions] = useState<string[]>(
    (client.faq?.map((q) => q.q) ?? INDUSTRY_QUESTIONS[industryKey] ?? DEFAULT_QUESTIONS).slice(0, 3)
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCustomise = plan === "pro" || plan === "premium";

  const resolvedGreeting = greeting
    .replace(/\{business\}/g, client.business_name ?? "your business")
    .replace(/\{name\}/g, "Sarah");

  const updateQuestion = (i: number, val: string) => {
    setQuestions((qs) => {
      const next = [...qs];
      next[i] = val;
      return next;
    });
  };

  const addQuestion = () => {
    if (questions.length >= 3) return;
    setQuestions((qs) => [...qs, ""]);
  };

  const removeQuestion = (i: number) => {
    setQuestions((qs) => qs.filter((_, idx) => idx !== i));
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const qualifyingFaq = questions
      .filter((q) => q.trim())
      .map((q) => ({ q, a: "" }));

    try {
      await saveAssistantStep({
        web_widget_color: color,
        web_widget_greeting: greeting,
        brand_color: color,
        faq: qualifyingFaq.length > 0 ? qualifyingFaq : null,
      });
      await onAdvance();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save — please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="pt-10">
      <h1 className="text-display-1 font-semibold text-fg mb-2">
        Configure your assistant.
      </h1>
      <p className="text-fg-muted text-body mb-8">
        Customise how your widget greets visitors and qualifies leads. The preview updates live.
      </p>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-8 items-start">
        <form onSubmit={handleSubmit} className="space-y-5">

          {/* Accent colour — available on all plans */}
          <Field label="Accent colour">
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer bg-transparent p-0.5"
                aria-label="Pick accent colour"
              />
              <Input
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="flex-1 font-mono uppercase"
                placeholder="#E85A2C"
                maxLength={7}
              />
            </div>
          </Field>

          {/* Greeting — Pro/Premium only */}
          <div className="relative">
            {!canCustomise && (
              <div className="absolute inset-0 z-10 rounded-xl bg-surface/70 backdrop-blur-[2px] flex items-center justify-center gap-2 border border-border">
                <Lock className="w-4 h-4 text-fg-muted" />
                <span className="text-small text-fg-muted font-medium">Custom greeting — Pro &amp; Premium</span>
              </div>
            )}
            <Field label="Greeting message" hint='Use {business} for your business name.'>
              <Textarea
                value={greeting}
                onChange={(e) => setGreeting(e.target.value)}
                rows={3}
                placeholder="Hi! Welcome to {business}. How can I help you today?"
                disabled={!canCustomise}
              />
            </Field>
          </div>

          {/* Qualifying questions — Pro/Premium only */}
          <div className="relative">
            {!canCustomise && (
              <div className="absolute inset-0 z-10 rounded-xl bg-surface/70 backdrop-blur-[2px] flex items-center justify-center gap-2 border border-border">
                <Lock className="w-4 h-4 text-fg-muted" />
                <span className="text-small text-fg-muted font-medium">Custom questions — Pro &amp; Premium</span>
              </div>
            )}
            <Field label="Qualifying questions" hint="Up to 3 questions your assistant asks every lead.">
              <div className="space-y-2">
                {questions.map((q, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      value={q}
                      onChange={(e) => updateQuestion(i, e.target.value)}
                      placeholder={`Question ${i + 1}`}
                      disabled={!canCustomise}
                      className="flex-1"
                    />
                    {questions.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeQuestion(i)}
                        disabled={!canCustomise}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-fg-subtle hover:text-danger hover:bg-danger/10 transition-colors duration-150 cursor-pointer shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
                        aria-label="Remove question"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {questions.length < 3 && (
                  <button
                    type="button"
                    onClick={addQuestion}
                    disabled={!canCustomise}
                    className="flex items-center gap-2 text-tiny text-brand hover:text-brand-hover font-medium transition-colors duration-150 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed pt-1"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add question
                  </button>
                )}
              </div>
            </Field>
          </div>

          {!canCustomise && (
            <div className="rounded-xl bg-brand/[0.06] border border-brand/20 px-4 py-3">
              <p className="text-small text-fg-muted leading-relaxed">
                <span className="font-semibold text-fg">Upgrade to Pro</span> to customise your greeting and qualifying questions. Colour is available on all plans.
              </p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onBack}>← Back</Button>
            <Button type="submit" disabled={saving} className="flex-1 justify-center">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Save & continue →"}
            </Button>
          </div>
        </form>

        {/* Live preview */}
        <div className="md:sticky md:top-6">
          <p className="text-fg-subtle text-xs font-semibold uppercase tracking-wider mb-3">Live preview</p>
          <WidgetPreview
            color={color}
            greeting={resolvedGreeting}
            launcherLabel="Chat with us"
            position="bottom-right"
            businessName={client.business_name ?? "Your Business"}
          />
          {!canCustomise && (
            <div className="mt-3 px-3 py-2.5 rounded-xl bg-white/[0.03] border border-line text-center">
              <p className="text-tiny text-fg-muted">
                &ldquo;Powered by Qwikly&rdquo; badge shown on Starter
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
