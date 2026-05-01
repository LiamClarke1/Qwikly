export const FAQ_DATA = [
  {
    question: "What is Qwikly?",
    answer:
      "Qwikly is an AI-powered lead response and lifecycle platform for South African service businesses. It handles WhatsApp and email leads, qualifies them, books appointments, sends follow-ups, recovers no-shows, and revives dormant leads. It runs 24/7 so you never lose a job because you were too busy to reply.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Qwikly offers three flat monthly plans: Lite at R399/month (up to 25 bookings), Pro at R799/month (unlimited bookings), and Business at R1,499/month (teams and advanced features). No per-job fees, no commissions, no setup costs. Pay annually and get 2 months free.",
  },
  {
    question: "What trades and industries do you work with?",
    answer:
      "Electricians, plumbers, roofers, solar installers, pest control, aircon technicians, pool services, landscapers, garage door specialists, security companies, dentists, beauty salons and spas, auto mechanics, estate agents, cleaning services, tutoring, vets, photographers, moving companies, fitness trainers, and more. If you take leads on WhatsApp or email, Qwikly can handle them.",
  },
  {
    question: "Does Qwikly handle email leads too?",
    answer:
      "Yes. Qwikly responds to email leads on behalf of your business using the same trade-specific AI. It replies, qualifies, checks your availability, and books the appointment, all in email. Every conversation is visible in your dashboard.",
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
      "During setup we walk through your services, pricing, service areas, and FAQs. The AI is trained on your specific trade, so every reply sounds like it came from you, not a robot. We have custom prompts for 10+ trades.",
  },
  {
    question: "Will customers know it's an AI?",
    answer:
      "Most won't. The AI uses natural, conversational language tailored to your brand voice and trade. If a customer ever asks directly, the AI will be transparent. But the goal is to feel like a helpful team member, not a chatbot.",
  },
  {
    question: "What if a lead asks something the AI can't answer?",
    answer:
      "The AI will let the customer know that someone from your team will follow up shortly, and immediately notifies you so nothing falls through. You can jump in at any time from the dashboard.",
  },
  {
    question: "How long does setup take?",
    answer:
      "Most businesses are live within 24 to 48 hours. We handle the heavy lifting: WhatsApp integration, email setup, calendar connection, and AI training. You just answer a few questions about your services and availability.",
  },
];

export function buildFAQSchema(faqs: typeof FAQ_DATA) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((f) => ({
      "@type": "Question",
      name: f.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: f.answer,
      },
    })),
  };
}
