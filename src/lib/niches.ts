// Niche landing page data. One template, many niches.
// Each entry powers a programmatic page at /niche/[slug].
//
// Notes for future edits:
//  - All currency is in ZAR.
//  - defaultJobValue, defaultEnquiriesPerMonth, defaultCloseRate are
//    industry estimates. Liam can refine them per niche.
//  - testimonialSlot starts as TODO until a real quote is collected.
//  - No em or en dashes anywhere. Commas only.

export interface NicheTestimonial {
  name: string;
  business: string;
  town: string;
  quote: string;
  jobsBooked: number;
}

export interface Niche {
  slug: string;
  label: string;
  headline: string;
  painPoints: [string, string, string];
  jargon: string[];
  defaultJobValue: number;
  defaultEnquiriesPerMonth: number;
  defaultCloseRate: number;
  testimonialSlot: NicheTestimonial;
}

export const niches: Niche[] = [
  {
    slug: "plumbers",
    label: "Plumbers",
    headline: "Every burst geyser, captured. Every quote, sent.",
    painPoints: [
      "After-hours emergencies you miss while on a job",
      "Quotes that take 24 hours to send, then the customer ghosts",
      "WhatsApp enquiries lost in your phone between callouts",
    ],
    jargon: ["geyser", "blocked drain", "leak detection", "callout fee"],
    defaultJobValue: 1800,
    defaultEnquiriesPerMonth: 40,
    defaultCloseRate: 0.35,
    testimonialSlot: {
      name: "TODO",
      business: "TODO",
      town: "TODO",
      quote: "TODO",
      jobsBooked: 0,
    },
  },
  {
    slug: "electricians",
    label: "Electricians",
    headline: "Every COC enquiry, captured. Every callout, booked.",
    painPoints: [
      "Power-out calls at 9pm that ring out while you finish a job",
      "COC quote requests that sit unread until the next morning",
      "Estate agents and landlords who go silent if you do not reply same hour",
    ],
    jargon: ["COC", "DB board", "load shedding backup", "tripping circuit"],
    defaultJobValue: 2400,
    defaultEnquiriesPerMonth: 35,
    defaultCloseRate: 0.4,
    testimonialSlot: {
      name: "TODO",
      business: "TODO",
      town: "TODO",
      quote: "TODO",
      jobsBooked: 0,
    },
  },
  {
    slug: "salons",
    label: "Hair and Beauty Salons",
    headline: "Every booking enquiry, captured. Every chair, filled.",
    painPoints: [
      "DM enquiries while you are mid colour, lost in the notification stack",
      "Last-minute cancellations that leave a chair empty for the rest of the day",
      "Price questions that go unanswered, so the client books the salon next door",
    ],
    jargon: ["balayage", "colour correction", "blow wave", "gel manicure"],
    defaultJobValue: 850,
    defaultEnquiriesPerMonth: 90,
    defaultCloseRate: 0.5,
    testimonialSlot: {
      name: "TODO",
      business: "TODO",
      town: "TODO",
      quote: "TODO",
      jobsBooked: 0,
    },
  },
  {
    slug: "dentists",
    label: "Dentists",
    headline: "Every new patient enquiry, captured. Every chair, booked.",
    painPoints: [
      "Patients who phone after hours and never call back the next day",
      "Front desk too busy with walk-ins to answer website chats",
      "Medical aid questions left unanswered, so the patient picks the next clinic",
    ],
    jargon: ["scale and polish", "extraction", "medical aid", "emergency appointment"],
    defaultJobValue: 1500,
    defaultEnquiriesPerMonth: 55,
    defaultCloseRate: 0.45,
    testimonialSlot: {
      name: "TODO",
      business: "TODO",
      town: "TODO",
      quote: "TODO",
      jobsBooked: 0,
    },
  },
  {
    slug: "builders",
    label: "Builders",
    headline: "Every renovation enquiry, captured. Every site visit, booked.",
    painPoints: [
      "Quote requests that pile up while you are on a build site without signal",
      "Homeowners who want a callback today and pick the next builder if they do not get one",
      "Repeat questions about scope and timing that eat your evening admin time",
    ],
    jargon: ["scope of works", "site visit", "snag list", "extension"],
    defaultJobValue: 8500,
    defaultEnquiriesPerMonth: 22,
    defaultCloseRate: 0.2,
    testimonialSlot: {
      name: "TODO",
      business: "TODO",
      town: "TODO",
      quote: "TODO",
      jobsBooked: 0,
    },
  },
  {
    slug: "auto",
    label: "Auto Repair and Panel Beaters",
    headline: "Every dent and breakdown, captured. Every bay, booked.",
    painPoints: [
      "Insurance assessment requests that sit in your inbox for two days",
      "Walk-in customers asking for a quick quote while you are under a bonnet",
      "WhatsApp photos of damage that take an evening to reply to",
    ],
    jargon: ["panel beating", "spray booth", "insurance assessment", "courtesy car"],
    defaultJobValue: 6500,
    defaultEnquiriesPerMonth: 28,
    defaultCloseRate: 0.3,
    testimonialSlot: {
      name: "TODO",
      business: "TODO",
      town: "TODO",
      quote: "TODO",
      jobsBooked: 0,
    },
  },
  {
    slug: "attorneys",
    label: "Attorneys",
    headline: "Every new matter enquiry, captured. Every consultation, booked.",
    painPoints: [
      "After-hours enquiries from people in a legal panic that you only see the next day",
      "Consultation requests that need qualifying before they hit your diary",
      "Conveyancing leads who pick the next firm if they wait more than a few hours",
    ],
    jargon: ["conveyancing", "letter of demand", "consultation fee", "matter intake"],
    defaultJobValue: 4500,
    defaultEnquiriesPerMonth: 30,
    defaultCloseRate: 0.35,
    testimonialSlot: {
      name: "TODO",
      business: "TODO",
      town: "TODO",
      quote: "TODO",
      jobsBooked: 0,
    },
  },
  {
    slug: "cleaning",
    label: "Cleaning Services",
    headline: "Every cleaning enquiry, captured. Every diary slot, filled.",
    painPoints: [
      "Once-off deep clean enquiries that need a quote in the next hour or they vanish",
      "Office park managers who ask for pricing and book the first company that replies",
      "Recurring service questions you cannot answer while supervising a site",
    ],
    jargon: ["deep clean", "once-off", "weekly contract", "post-construction clean"],
    defaultJobValue: 950,
    defaultEnquiriesPerMonth: 60,
    defaultCloseRate: 0.4,
    testimonialSlot: {
      name: "TODO",
      business: "TODO",
      town: "TODO",
      quote: "TODO",
      jobsBooked: 0,
    },
  },
];

export function getNiche(slug: string): Niche | undefined {
  return niches.find((n) => n.slug === slug);
}

export function getAllNicheSlugs(): string[] {
  return niches.map((n) => n.slug);
}
