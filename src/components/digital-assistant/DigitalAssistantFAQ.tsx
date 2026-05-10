"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";

export interface FAQItem {
  question: string;
  answer: string;
}

interface Props {
  items: FAQItem[];
}

export default function DigitalAssistantFAQ({ items }: Props) {
  const [openFAQ, setOpenFAQ] = useState<number | null>(0);

  return (
    <div className="divide-y divide-ink/10 border-t border-ink/10">
      {items.map((faq, index) => {
        const isOpen = openFAQ === index;
        return (
          <div key={index}>
            <button
              onClick={() => setOpenFAQ(isOpen ? null : index)}
              className="w-full flex items-start justify-between py-6 text-left gap-6 cursor-pointer group"
              aria-expanded={isOpen}
            >
              <span
                className={`font-display text-xl leading-snug transition-colors duration-200 ${
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
                isOpen ? "max-h-72 pb-8" : "max-h-0"
              }`}
            >
              <p className="text-ink-700 text-base leading-relaxed max-w-prose">
                {faq.answer}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
