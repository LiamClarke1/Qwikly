"use client";

import { useState } from "react";
import { Plus, Minus } from "lucide-react";
import { FAQ_DATA } from "@/lib/faq-data";

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
            <p className="eyebrow text-ink-500 mb-6 reveal-up">Answers</p>
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
              {FAQ_DATA.map((faq, index) => {
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
