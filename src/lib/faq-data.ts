export const FAQ_DATA = [
  {
    question: "What is Qwikly?",
    answer:
      "Qwikly is a digital assistant platform for your website. You paste one script tag onto your site, and Qwikly greets visitors, asks qualifying questions, captures their contact details, and delivers warm leads to your inbox. 24/7, even while you sleep.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Qwikly has four plans. Starter is R699/month for 50 leads, ideal for solos. Pro is R1,799/month for 200 leads with custom greeting and qualifying questions, ideal for small multi-person practices. Business is R3,999/month for 600 leads with custom branding (your logo, no Qwikly footer), CSV exports, and priority support, ideal for multi-doctor or multi-agent practices. Enterprise is from R7,999/month with white-label, API access, and a 1-hour support SLA, custom volume pricing on request. All plans start with a free 14-day trial. Annual billing saves 15%. Extra leads are R20 each. No per-job fees, no commissions ever.",
  },
  {
    question: "What counts as a qualified lead?",
    answer:
      "A lead only counts when a visitor shares their phone number or email address. Just opening the chat or asking a question is not a lead, curiosity is free. Bounced chats, visitors who give only their name, and spam are never counted. A visitor who confirms booking intent still counts as just one lead, not extra.",
  },
  {
    question: "What happens when I hit my monthly lead limit?",
    answer:
      "We'll notify you before you hit your cap. You can upgrade your plan or add extra leads at R20 each. No automatic billing, no surprise charges. Your digital assistant keeps working either way.",
  },
  {
    question: "What happens after my 14-day trial?",
    answer:
      "At the end of your trial, you choose a paid plan to continue. If you don't upgrade, your account pauses and no further leads are captured. You keep access to your dashboard and all lead history. Upgrade at any time to reactivate.",
  },
  {
    question: "What businesses is Qwikly built for?",
    answer:
      "Any local business with a website that receives enquiries: restaurants, cafes, salons, gyms, clinics, dental practices, contractors, law firms, cleaning services, tutors, photographers, and more. If customers ask questions before booking, Qwikly handles that conversation for you.",
  },
  {
    question: "How does setup work?",
    answer:
      "Sign up, then our tool scans your existing website and extracts your services, pricing, and FAQs automatically. You review and confirm the details in your dashboard, then paste one script tag into your website HTML. Most businesses are live in under 10 minutes. No developer needed.",
  },
  {
    question: "Can I use my own branding?",
    answer:
      "Yes. On the Business and Enterprise plans, your digital assistant uses your logo and colour scheme with no Qwikly branding. Starter and Pro plans show 'Powered by Qwikly' in the footer.",
  },
  {
    question: "Can I see what the assistant is saying to visitors?",
    answer:
      "Yes. Your dashboard shows every conversation in full: what the visitor asked, how the assistant responded, and whether the lead was qualified. You can review and export at any time.",
  },
  {
    question: "What happens when a lead is qualified?",
    answer:
      "You receive an email with the lead's name, contact details, what they're looking for, and a one-click confirmation link to accept the booking request. You're always in control of what gets booked.",
  },
  {
    question: "Will visitors know it's a digital assistant?",
    answer:
      "The assistant is conversational and helpful rather than robotic. If a visitor asks directly whether they're speaking to a digital assistant, it will be transparent. The goal is a helpful experience, not deception.",
  },
  {
    question: "Do you take a cut of my jobs?",
    answer:
      "Never. Qwikly charges a flat monthly fee only. We earn nothing from your bookings. Every rand from every job stays with your business.",
  },
  {
    question: "Is Qwikly POPIA compliant?",
    answer:
      "Yes. Qwikly is fully POPIA-compliant. All visitor data is processed and stored in South Africa. We never sell your data or your customers' data to third parties.",
  },
  {
    question: "When will calendar integration launch?",
    answer:
      "Calendar integration is on the roadmap for Q3 2026. Business and Enterprise subscribers will get early access. You'll be notified by email when it's available.",
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
