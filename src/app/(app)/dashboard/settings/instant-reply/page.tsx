"use client";

export const dynamic = "force-dynamic";

import InstantReplyConfig from "@/components/InstantReplyConfig";
import { PageHeader } from "@/components/ui/page";

export default function InstantReplySettingsPage() {
  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow="Notifications"
        title="Instant Reply 60s"
        description="Qwikly pings you on WhatsApp the second a new lead is captured. Reply YES and we send your booking link. Set your contact details and business hours below."
      />
      <InstantReplyConfig />
    </div>
  );
}
