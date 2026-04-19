import {
  MessageSquare,
  Bot,
  UserCheck,
  CalendarCheck,
  Brain,
  Bell,
  BarChart3,
} from "lucide-react";
import SectionHeading from "@/components/SectionHeading";
import CTAButton from "@/components/CTAButton";

const steps = [
  {
    icon: MessageSquare,
    title: "A Lead Messages Your Business",
    description:
      "Someone WhatsApps your business number about a job. Maybe it's a burst geyser at 2am. Maybe it's a quote request on a Saturday morning. Doesn't matter when, Qwikly is always on.",
  },
  {
    icon: Bot,
    title: "Qwikly Replies in 30 Seconds",
    description:
      "The AI responds instantly with a natural, friendly message. It asks the right qualifying questions: what they need, where they are, how urgent it is. No scripts, no decision trees, just natural conversation in SA English.",
  },
  {
    icon: UserCheck,
    title: "The Lead Gets Qualified",
    description:
      "Qwikly checks if the lead is in your service area, understands the job type, and assesses urgency. Leads that don't qualify get a polite redirect. Qualified leads move to booking.",
  },
  {
    icon: CalendarCheck,
    title: "Appointment Booked Into Your Calendar",
    description:
      "The AI checks your Google Calendar availability, offers time slots, and books the appointment. You get an instant WhatsApp notification with all the details. The customer gets a confirmation. Done.",
  },
];

const behindTheScenes = [
  {
    icon: Brain,
    title: "Trade-Specific Knowledge",
    description:
      "The AI is trained on your specific trade. It knows what questions an electrician gets vs a plumber. It knows your service areas, your pricing ranges, and your FAQ.",
  },
  {
    icon: Bell,
    title: "Instant Notifications",
    description:
      "Every time an appointment is booked, you get a WhatsApp notification with the customer's name, area, job type, and appointment time.",
  },
  {
    icon: BarChart3,
    title: "Conversation Logging",
    description:
      "Every conversation is logged. You can see exactly what the AI said, how it qualified the lead, and why it booked or didn't book.",
  },
];

export default function HowItWorksPage() {
  return (
    <main className="bg-background">
      {/* Hero */}
      <section className="pt-8 pb-16">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="How Qwikly Works"
            subtitle="From first message to booked appointment in under 2 minutes"
          />
        </div>
      </section>

      {/* Step-by-Step Timeline */}
      <section className="pb-20">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isLast = index === steps.length - 1;

              return (
                <div key={step.title} className="relative flex gap-6">
                  {/* Timeline column */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-cta text-white font-heading font-bold text-sm flex-shrink-0">
                      {index + 1}
                    </div>
                    {!isLast && (
                      <div className="w-0.5 bg-border flex-1 my-2" />
                    )}
                  </div>

                  {/* Content */}
                  <div className={`pb-12 ${isLast ? "pb-0" : ""}`}>
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="w-5 h-5 text-cta" />
                      <h3 className="font-heading text-xl font-semibold text-primary">
                        {step.title}
                      </h3>
                    </div>
                    <p className="text-muted leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* What Happens Behind the Scenes */}
      <section className="py-20 bg-white">
        <div className="mx-auto max-w-site px-4 sm:px-6 lg:px-8">
          <SectionHeading
            title="What Happens Behind the Scenes"
            subtitle="Powerful features working quietly in the background."
          />

          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            {behindTheScenes.map((feature) => {
              const Icon = feature.icon;

              return (
                <div
                  key={feature.title}
                  className="bg-card rounded-2xl p-8 border border-border"
                >
                  <div className="w-12 h-12 rounded-xl bg-cta/10 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-cta" />
                  </div>
                  <h3 className="font-heading text-lg font-semibold text-primary mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20 bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#0F172A] relative overflow-hidden">
        <div className="absolute inset-0 hero-grid pointer-events-none" />
        <div className="relative mx-auto max-w-site px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading text-3xl md:text-4xl font-bold text-white">
            See It In Action
          </h2>
          <p className="text-gray-300 text-lg mt-4 max-w-xl mx-auto">
            Start your free 7-day trial and watch Qwikly handle your first
            leads.
          </p>
          <div className="mt-8">
            <CTAButton size="lg">Start Your Free 7-Day Trial</CTAButton>
          </div>
        </div>
      </section>
    </main>
  );
}
