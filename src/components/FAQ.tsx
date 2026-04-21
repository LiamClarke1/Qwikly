"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";

const faqs = [
  {
    question: "What is Qwikly?",
    answer:
      "Qwikly is an AI-powered lead response and lifecycle management platform built for South African service businesses. It handles WhatsApp and email leads, qualifies them, books appointments, sends automated follow-ups, recovers no-shows, and revives dormant leads. It runs 24/7 so you never lose a job because you were too busy to reply.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Qwikly charges 8% of the service price when a booking is made. There are no monthly fees, no setup costs, and no contracts. The minimum per booking is R150 and the maximum is R5,000, so you always pay a fair amount relative to what you earn. You only pay when the AI successfully books a real appointment.",
  },
  {
    question: "What trades and industries do you work with?",
    answer:
      "Electricians, plumbers, roofers, solar installers, pest control, aircon technicians, pool services, landscapers, garage door specialists, security companies, dentists, beauty salons and spas, auto mechanics, estate agents, cleaning services, tutoring, vets, photographers, moving companies, fitness trainers, and more. If your business gets leads via WhatsApp or email, Qwikly can handle them.",
  },
  {
    question: "Does Qwikly handle email leads too?",
    answer:
      "Yes. Qwikly responds to email leads on behalf of your business using the same trade-specific AI. The AI replies, qualifies the lead, checks your availability, and books the appointment, all through email. Every email conversation is visible in your dashboard.",
  },
  {
    question: "What happens if a customer goes quiet?",
    answer:
      "Qwikly runs an automated follow-up sequence. If the lead goes quiet, the AI re-engages at 4 hours, 24 hours, 2 days, and 5 days. If they don't respond on WhatsApp, the AI switches to email. At 30 days dormant, Qwikly sends a seasonal or trade-specific revival message to bring them back. No lead is ever abandoned.",
  },
  {
    question: "What about no-shows?",
    answer:
      "If a customer misses their appointment, Qwikly sends an automatic rebooking message within minutes. It suggests the next available time slot and makes it easy for the customer to reschedule, recovering revenue that would otherwise be lost.",
  },
  {
    question: "Does it work with Google Calendar?",
    answer:
      "Yes. Qwikly connects directly to your Google Calendar. It checks your real-time availability, offers slots to leads, books confirmed appointments, and sends reminders 24 hours and 1 hour before each appointment to both you and the customer.",
  },
  {
    question: "Can I see what the AI is saying to my customers?",
    answer:
      "Absolutely. The Qwikly dashboard gives you full visibility into every conversation, across both WhatsApp and email. You can read transcripts, see booking details, review qualification outcomes, and step in at any time.",
  },
  {
    question: "How does the AI know about my business?",
    answer:
      "During setup we walk through your services, pricing, service areas, and FAQs. The AI is trained on your specific trade, so every reply sounds like it came from you, not a robot. We have custom prompts for 10+ trades including electricians, plumbers, roofers, solar installers, and more.",
  },
  {
    question: "Will customers know it\u2019s an AI?",
    answer:
      "Most won\u2019t. The AI uses natural, conversational language tailored to your brand voice and trade. If a customer ever asks directly, the AI will be transparent, but the goal is to feel like a helpful team member, not a chatbot.",
  },
  {
    question: "What if a lead asks something the AI can\u2019t answer?",
    answer:
      "The AI will let the customer know that someone from your team will follow up shortly and immediately notifies you so nothing falls through the cracks. You can jump in at any time from the dashboard.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most businesses are live within 24 to 48 hours. We handle the heavy lifting, including WhatsApp integration, email setup, calendar connection, and AI training. You just answer a few questions about your services and availability.",
  },
  {
    question: "How do I get started?",
    answer:
      "Click the \u2018Explore Your 7-Day Trial\u2019 button, fill in a few details, and we\u2019ll reach out to get you set up. Most businesses start seeing results within their first week.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section id="faq" className="py-16 bg-bg-light">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Questions Worth Asking Before You Start"
          subtitle="Straight answers about how Qwikly works, what it costs, and what to expect from day one."
        />

        <div className="mt-12 max-w-3xl mx-auto divide-y divide-border-light">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index}>
                <button
                  onClick={() => toggle(index)}
                  className="w-full flex items-center justify-between py-5 text-left gap-4 cursor-pointer group"
                >
                  <span className="font-sans font-semibold text-text-dark text-base md:text-lg group-hover:text-accent transition-colors duration-200">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-text-muted-dark flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-96 pb-5" : "max-h-0"
                  }`}
                >
                  <p className="text-text-muted-dark text-sm md:text-base leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
