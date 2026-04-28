const rows = [
  {
    tech: "AI-powered NLU and intent classification",
    human: "Knows the difference between a price question and a booking request",
  },
  {
    tech: "Multi-channel omnichannel CRM integration",
    human: "Replies on WhatsApp and email, all in one place",
  },
  {
    tech: "Google Calendar API sync with conflict resolution",
    human: "Books straight into your calendar. No double bookings, ever.",
  },
  {
    tech: "Automated multi-step follow-up sequences",
    human: "Chases the customers who go quiet, so you don't have to",
  },
  {
    tech: "Reporting dashboard with analytics and attribution",
    human: "Tells you exactly how much money Qwikly made you this week",
  },
  {
    tech: "Dormant lead re-engagement with decay scoring",
    human: "Brings back customers who enquired months ago and forgot",
  },
];

export function FeatureTranslation() {
  return (
    <div className="space-y-0 divide-y divide-ink/8">
      {/* Header */}
      <div className="grid grid-cols-2 gap-4 pb-4">
        <p className="eyebrow text-ink-400">What tech companies say</p>
        <p className="eyebrow text-ember">What this actually means for you</p>
      </div>

      {rows.map((row, i) => (
        <div key={i} className="grid grid-cols-2 gap-4 py-5 group">
          {/* Left — greyed, struck */}
          <div className="flex items-start gap-3">
            <span className="mt-1 w-3 h-3 rounded-sm bg-ink/8 flex-shrink-0" />
            <p className="text-sm text-ink-400 line-through leading-relaxed">{row.tech}</p>
          </div>

          {/* Right — ember highlight */}
          <div className="flex items-start gap-3">
            <span className="mt-1 w-3 h-3 rounded-sm bg-ember/15 border border-ember/25 flex-shrink-0" />
            <p className="text-sm text-ink-700 leading-relaxed font-medium group-hover:text-ink transition-colors duration-300">
              {row.human}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
