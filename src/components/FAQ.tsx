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
    question: "Does Qwikly handle email leads too?",
    answer:
      "Yes. Qwikly responds to email leads on behalf of your business, using the same trade-specific AI. If a customer reaches out via email, the AI replies, qualifies them, and books the appointment, just like it does on WhatsApp.",
  },
  {
    question: "What happens if a customer doesn\u2019t reply?",
    answer:
      "Qwikly automatically follows up. If a lead goes quiet, the AI re-engages them at 4 hours, 24 hours, 2 days, and 5 days. If they still don\u2019t respond on WhatsApp, the AI switches to email. No lead falls through the cracks.",
  },
  {
    question: "What about no-shows?",
    answer:
      "If a customer misses their appointment, Qwikly sends an automatic rebooking message within minutes. It suggests the next available time slot and makes it easy for the customer to reschedule, recovering revenue that would otherwise be lost.",
  },
  {
    question: "Can I see what the AI is saying to my customers?",
    answer:
      "Absolutely. The Qwikly dashboard gives you full visibility into every conversation, across both WhatsApp and email. You can read transcripts, see booking details, review qualification outcomes, and step in at any time.",
  },
  {
    question: "Does it work with Google Calendar?",
    answer:
      "Yes. Qwikly connects directly to your Google Calendar. It checks your real-time availability, offers slots to leads, books confirmed appointments, and sends reminders 24 hours and 1 hour before each appointment to both you and the customer.",
  },
  {
    question: "How does the AI know about my business?",
    answer:
      "During setup we walk through your services, pricing, service areas, and FAQs. The AI is trained on your specific trade, so every reply sounds like it came from you, not a robot. We have custom prompts for 10+ trades including electricians, plumbers, roofers, solar, and more.",
  },
  {
    question: "Will customers know it\u2019s an AI?",
    answer:
      "Most won\u2019t. The AI uses natural, conversational language tailored to your brand voice and trade. If a customer ever asks directly, the AI will be transparent, but the goal is to feel like a helpful team member, not a chatbot.",
  },
  {
    question: "How much does it cost?",
    answer:
      "R750 per booked appointment. No monthly fees, no setup costs, no contracts. You only pay when the AI successfully books a real appointment. Start with a free 7-day trial to see results before paying anything.",
  },
  {
    question: "What trades do you work with?",
    answer:
      "Electricians, plumbers, roofers, solar installers, pest control, aircon technicians, pool services, landscapers, garage door specialists, security companies, and more. If your business gets leads via WhatsApp or email, Qwikly can help.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most businesses are live within 24 to 48 hours. We handle the heavy lifting, including WhatsApp integration, email setup, calendar connection, and AI training. You just answer a few questions about your services and availability.",
  },
  {
    question: "What if a lead asks something the AI can\u2019t answer?",
    answer:
      "The AI will let the customer know that someone from your team will follow up shortly and immediately notifies you so nothing falls through the cracks. You can jump in at any time from the dashboard.",
  },
  {
    question: "How do I get started?",
    answer:
      "Click the \u2018Start Free Trial\u2019 button, fill in a few details, and we\u2019ll reach out to get you set up. Most businesses start seeing results within their first week.",
  },
  {
    question: "What industries do you work with?",
    answer:
      "Electricians, plumbers, roofers, solar installers, pest control, aircon technicians, pool services, landscapers, garage door specialists, security companies, dentists and dental practices, beauty salons and spas, auto mechanics and panel beaters, estate agents and property management, cleaning services (domestic and commercial), tutoring and education services, vets and animal clinics, photographers, moving companies, fitness trainers and gyms, and any other service business that receives leads.",
  },
  {
    question: "How does the email channel work?",
    answer:
      "When a lead emails your business, Qwikly\u2019s AI responds on your behalf within seconds, using the same trade-specific qualification flow as WhatsApp. The AI asks the right questions, qualifies the lead, checks your availability, and books the appointment, all through email. You can see every email conversation in the dashboard.",
  },
  {
    question: "What happens when a customer doesn\u2019t respond?",
    answer:
      "Qwikly runs an automated follow-up sequence. If the customer goes quiet, the AI re-engages at 4 hours, then 24 hours, then 2 days, then 5 days. If they still do not reply, the lead is marked dormant. At 30 days, Qwikly sends a seasonal or trade-specific revival message to bring them back. No lead is ever abandoned.",
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  function toggle(index: number) {
    setOpenIndex(openIndex === index ? null : index);
  }

  return (
    <section id="faq" className="py-20 bg-background">
      <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
        <SectionHeading
          title="Frequently Asked Questions"
          subtitle="Everything you need to know about the Qwikly platform."
        />

        <div className="mt-12 max-w-3xl mx-auto divide-y divide-border">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index}>
                <button
                  onClick={() => toggle(index)}
                  className="w-full flex items-center justify-between py-5 text-left gap-4 cursor-pointer group"
                >
                  <span className="font-heading font-semibold text-primary text-base md:text-lg group-hover:text-cta transition-colors duration-200">
                    {faq.question}
                  </span>
                  <ChevronDown
                    className={`w-5 h-5 text-muted flex-shrink-0 transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isOpen ? "max-h-96 pb-5" : "max-h-0"
                  }`}
                >
                  <p className="text-muted text-sm md:text-base leading-relaxed">
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
