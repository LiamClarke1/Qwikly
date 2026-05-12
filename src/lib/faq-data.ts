export const FAQ_DATA = [
  // ── About our two services ──────────────────────────────────────────────
  {
    question: "What is the difference between the Digital Assistant and Outbound?",
    answer:
      "The Digital Assistant lives on your website. It replies in under 60 seconds, qualifies the visitor, and emails the lead's contact details to you. Outbound is the other direction: every business day we deliver a short list of hand-picked prospects in your area, and you decide who to reach out to. Most clients start with one and add the other within 90 days.",
  },
  {
    question: "Do I need both?",
    answer:
      "Not at all. Start with whichever solves your bigger problem. Outbound is for quiet pipelines, the Digital Assistant is for busy websites with too many missed enquiries. The Digital Assistant is included in every plan; Outbound starts on Pro.",
  },
  {
    question: "Which service is right for a small local business?",
    answer:
      "The Digital Assistant. Local services like plumbers, salons, and electricians usually get most of their value from the assistant on their site. Outbound is most useful once you want a steady flow of new prospects to chase yourself.",
  },
  // ── Existing FAQ ────────────────────────────────────────────────────────
  {
    question: "What is Qwikly?",
    answer:
      "Qwikly is a digital assistant platform for your website. You paste one script tag onto your site, and Qwikly greets visitors, asks qualifying questions, captures their contact details, and delivers warm leads to your inbox. 24/7, even while you sleep.",
  },
  {
    question: "How much does it cost?",
    answer:
      "Qwikly has four plans. Starter is R699/month for 20 leads, ideal for solos. Pro is R1,799/month for 50 leads with custom branding (your logo), custom greeting, and qualifying questions, ideal for small multi-person practices. Business is R3,999/month for 200 leads with unlimited users, CSV exports, and priority support, ideal for multi-doctor or multi-agent practices. Enterprise is from R7,999/month with white-label, API access, and a 1-hour support SLA, custom volume pricing on request. All plans are invoiced monthly by EFT, no card required online. Book a setup call and we set everything up for you. Annual billing saves 15%. Top-ups for extra leads are billed at your plan's per-lead rate. No per-job fees, no commissions ever.",
  },
  {
    question: "What counts as a qualified lead?",
    answer:
      "A lead only counts when a visitor shares their phone number or email address. Just opening the chat or asking a question is not a lead, curiosity is free. Bounced chats, visitors who give only their name, and spam are never counted. A visitor who confirms booking intent still counts as just one lead, not extra.",
  },
  {
    question: "What happens when I hit my monthly lead limit?",
    answer:
      "We'll notify you before you hit your cap. You can upgrade your plan or top up at your plan's per-lead rate (R23 on Starter, R20 on Pro, R12 on Business — close to what you're already paying inside your plan, never a flat overage). No automatic billing, no surprise charges. Your digital assistant keeps working either way.",
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
      "Yes. On Pro, Business, and Enterprise plans, your digital assistant uses your logo and colour scheme with no Qwikly branding. Only the Starter plan shows 'Powered by Qwikly' in the footer.",
  },
  {
    question: "Can I see what the assistant is saying to visitors?",
    answer:
      "Yes. Your dashboard shows every conversation in full: what the visitor asked, how the assistant responded, and whether the lead was qualified. You can review and export at any time.",
  },
  {
    question: "How does the digital assistant notify me?",
    answer:
      "By email. As soon as a visitor is qualified, you get an email with their name, contact details, what they're looking for, and any preferred time they mentioned. You follow up directly. We don't send SMS or WhatsApp notifications to the owner.",
  },
  {
    question: "Do you book the call into my calendar?",
    answer:
      "No, we don't book calendars or send calendar invites. We deliver the lead's contact info to your inbox and you follow up directly. This keeps you in full control of when and how you respond.",
  },
  {
    question: "Is there a setup fee for Outbound?",
    answer:
      "No, Outbound is included on Pro and up at no setup cost. Pro gets 5 hand-picked prospects per business day, Founders 10, Business 15. You decide who to reach out to.",
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
    question: "Will you ever book calls into my calendar for me?",
    answer:
      "Not today. Today we email you the lead's contact details and any preferred time they mentioned, and you follow up directly. Calendar integration is on the roadmap, but until it ships, every plan delivers leads by email, no calendar booking on our side.",
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
