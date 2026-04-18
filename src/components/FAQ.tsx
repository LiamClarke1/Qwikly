"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import SectionHeading from "@/components/SectionHeading";

const faqs = [
  {
    question: "What is Qwikly?",
    answer:
      "Qwikly is an AI-powered WhatsApp assistant built for trade and service businesses. It replies to incoming leads instantly, qualifies them, answers common questions about your services, and books appointments on your behalf, so you never lose a job because you were too busy to reply.",
  },
  {
    question: "How does the AI know about my business?",
    answer:
      "During setup we walk through your services, pricing, service areas, and FAQs. The AI is trained on that information so every reply sounds like it came from you, not a robot.",
  },
  {
    question: "Will customers know it's an AI?",
    answer:
      "Most won't. The AI uses natural, conversational language tailored to your brand voice. If a customer ever asks directly, the AI will be transparent, but the goal is to feel like a helpful team member, not a chatbot.",
  },
  {
    question: "What happens after the AI books an appointment?",
    answer:
      "You get an instant notification with the customer's name, contact details, service requested, and the confirmed time. From there you take over and do what you do best.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Qwikly starts with a free trial so you can see results before paying anything. After that, plans are simple and affordable, designed for small businesses. Check the Pricing section for current rates.",
  },
  {
    question: "Is there a contract or monthly fee?",
    answer:
      "No long-term contracts. Qwikly is month-to-month, and you can cancel anytime. We keep your business because of results, not lock-in.",
  },
  {
    question: "What trades do you work with?",
    answer:
      "Plumbers, electricians, painters, landscapers, HVAC techs, cleaners, pest control, pool services, dental practices, beauty salons, and more. If your business gets leads via WhatsApp, Qwikly can help.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most businesses are live within 24 to 48 hours. We handle the heavy lifting. You just answer a few questions about your services and availability.",
  },
  {
    question: "What if a lead asks something the AI can't answer?",
    answer:
      "The AI will let the customer know that someone from your team will follow up shortly and immediately notifies you so nothing falls through the cracks.",
  },
  {
    question: "Can I see the conversations the AI has?",
    answer:
      "Absolutely. You have full visibility into every conversation. You can review chats anytime and step in whenever you want.",
  },
  {
    question: "Does it work after hours and on weekends?",
    answer:
      "Yes, Qwikly runs 24/7. Leads that come in at midnight or on a Sunday morning get an instant, professional reply, so you wake up to booked appointments instead of missed messages.",
  },
  {
    question: "How do I get started?",
    answer:
      "Click the 'Start Free Trial' button, fill in a few details, and we'll reach out to get you set up. Most businesses start seeing results within their first week.",
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
          subtitle="Everything you need to know about Qwikly."
        />

        <div className="mt-12 max-w-3xl mx-auto divide-y divide-border">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div key={index}>
                <button
                  onClick={() => toggle(index)}
                  className="w-full flex items-center justify-between py-5 text-left gap-4 cursor-pointer"
                >
                  <span className="font-heading font-semibold text-primary text-base md:text-lg">
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
