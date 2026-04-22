"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

const faqs = [
  {
    question: "What is Qwikly?",
    answer:
      "Qwikly is an AI-powered lead response and lifecycle platform for South African service businesses. It handles WhatsApp and email leads, qualifies them, books appointments, sends follow-ups, recovers no-shows, and revives dormant leads. It runs 24/7 so you never lose a job because you were too busy to reply.",
  },
  {
    question: "How much does it cost?",
    answer:
      "8% of the service price, charged only when a booking is made. No monthly fee, no setup cost, no contract. Minimum R150 per booking, maximum R5,000, so you always pay a fair amount relative to what you earn. You only pay when Qwikly successfully books a real appointment.",
  },
  {
    question: "What trades and industries do you work with?",
    answer:
      "Electricians, plumbers, roofers, solar installers, pest control, aircon technicians, pool services, landscapers, garage door specialists, security companies, dentists, beauty salons and spas, auto mechanics, estate agents, cleaning services, tutoring, vets, photographers, moving companies, fitness trainers, and more. If you take leads on WhatsApp or email, Qwikly can handle them.",
  },
  {
    question: "Does Qwikly handle email leads too?",
    answer:
      "Yes. Qwikly responds to email leads on behalf of your business using the same trade-specific AI. It replies, qualifies, checks your availability, and books the appointment — all in email. Every conversation is visible in your dashboard.",
  },
  {
    question: "What happens if a customer goes quiet?",
    answer:
      "Qwikly runs an automated follow-up sequence at 4 hours, 24 hours, 2 days, and 5 days. If they don't respond on WhatsApp, it switches to email. At 30 days dormant, Qwikly sends a seasonal or trade-specific revival message to bring them back. No lead is ever abandoned.",
  },
  {
    question: "What about no-shows?",
    answer:
      "If a customer misses their appointment, Qwikly sends an automatic rebooking message within minutes. It suggests the next available slot and makes it easy to reschedule, recovering revenue that would otherwise be lost.",
  },
  {
    question: "Does it work with Google Calendar?",
    answer:
      "Yes. Qwikly connects directly to your Google Calendar, checks real-time availability, offers slots, books confirmed appointments, and sends reminders 24 hours and 1 hour before each job to both you and the customer.",
  },
  {
    question: "Can I see what the AI is saying to my customers?",
    answer:
      "Absolutely. The Qwikly dashboard gives you full visibility into every conversation, across both WhatsApp and email. Read transcripts, see booking details, review qualification outcomes, and step in at any time.",
  },
  {
    question: "How does the AI know about my business?",
    answer:
      "During setup we walk through your services, pricing, service areas, and FAQs. The AI is trained on your specific trade — so every reply sounds like it came from you, not a robot. We have custom prompts for 10+ trades.",
  },
  {
    question: "Will customers know it's an AI?",
    answer:
      "Most won't. The AI uses natural, conversational language tailored to your brand voice and trade. If a customer ever asks directly, the AI will be transparent — but the goal is to feel like a helpful team member, not a chatbot.",
  },
  {
    question: "What if a lead asks something the AI can't answer?",
    answer:
      "The AI will let the customer know that someone from your team will follow up shortly, and immediately notifies you so nothing falls through. You can jump in at any time from the dashboard.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most businesses are live within 24 to 48 hours. We handle the heavy lifting — WhatsApp integration, email setup, calendar connection, AI training. You just answer a few questions about your services and availability.",
  },
  {
    question: "How do I get started?",
    answer:
      "Click 'Start your 7-day trial', fill in a few details, and we'll reach out to get you set up. Most businesses start seeing results within their first week.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section id="faq" className="relative py-28 md:py-40 grain">
      <div className="relative mx-auto max-w-site px-6 lg:px-10">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 mb-16">
          <div className="md:col-span-5">
            <p className="eyebrow text-ink-500 mb-6 reveal-up">08 — Answers</p>
            <h2 className="display-lg text-ink reveal-up">
              Ask us
              <br />
              <em className="italic font-light">anything</em>.
            </h2>
            <p className="mt-6 text-ink-700 max-w-sm leading-relaxed reveal-up">
              Straight answers about how Qwikly works, what it costs, and what
              to expect from day one.
            </p>
          </div>

          <div className="md:col-span-7 md:col-start-6">
            <div className="divide-y divide-ink/10 border-t border-b border-ink/10">
              {faqs.map((faq, index) => {
                const isOpen = openIndex === index;
                return (
                  <div key={index}>
                    <button
                      onClick={() => toggle(index)}
                      className="w-full flex items-start justify-between py-6 text-left gap-6 cursor-pointer group"
                    >
                      <span
                        className={`font-display text-xl md:text-2xl leading-snug transition-colors duration-200 ${
                          isOpen ? "text-ember" : "text-ink group-hover:text-ember"
                        }`}
                      >
                        {faq.question}
                      </span>
                      <span
                        className={`flex-shrink-0 mt-1 w-8 h-8 rounded-full border flex items-center justify-center transition-all duration-300 ${
                          isOpen
                            ? "bg-ember border-ember text-paper"
                            : "border-ink/20 text-ink group-hover:border-ember group-hover:text-ember"
                        }`}
                      >
                        {isOpen ? (
                          <Minus className="w-4 h-4" strokeWidth={2} />
                        ) : (
                          <Plus className="w-4 h-4" strokeWidth={2} />
                        )}
                      </span>
                    </button>
                    <div
                      className={`overflow-hidden transition-all duration-500 ease-in-out ${
                        isOpen ? "max-h-96 pb-8" : "max-h-0"
                      }`}
                    >
                      <p className="text-ink-700 text-base md:text-lg leading-relaxed max-w-prose">
                        {faq.answer}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
