import {
  Html, Head, Preview, Body, Container, Section,
  Text, Heading, Hr, Link,
} from "@react-email/components";
import { render } from "@react-email/render";
import React from "react";

interface LeadNotificationEmailProps {
  businessName: string;
  accentColor?: string;
  leadName: string;
  leadEmail?: string;
  leadPhone?: string;
  source: string;
  message?: string;
  dashboardUrl: string;
}

export function LeadNotificationEmail({
  businessName,
  accentColor = "#E85A2C",
  leadName,
  leadEmail,
  leadPhone,
  source,
  message,
  dashboardUrl,
}: LeadNotificationEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>New lead: {leadName} from {source}</Preview>
      <Body style={{ backgroundColor: "#07080B", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px" }}>

          <Text style={{ fontSize: 22, fontWeight: 700, color: "#F4F4F5", letterSpacing: "-0.5px", marginBottom: 32 }}>
            Qwikly<span style={{ color: accentColor }}>.</span>
          </Text>

          <Section style={{ backgroundColor: "#0D111A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 32 }}>
            <Text style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: accentColor }}>
              New lead
            </Text>
            <Heading as="h1" style={{ margin: "0 0 20px", fontSize: 20, fontWeight: 700, color: "#F4F4F5" }}>
              {leadName} is interested
            </Heading>

            {/* Details */}
            <table width="100%" cellPadding={0} cellSpacing={0} style={{ borderTop: "1px solid rgba(255,255,255,0.06)", marginBottom: 24 }}>
              {[
                ["Source", source],
                ...(leadEmail ? [["Email", leadEmail]] : []),
                ...(leadPhone ? [["Phone", leadPhone]] : []),
                ...(message ? [["Message", message]] : []),
              ].map(([label, value]) => (
                <tr key={label}>
                  <td style={{ padding: "8px 0", color: "#9CA3AF", fontSize: 13, width: 80 }}>{label}</td>
                  <td style={{ padding: "8px 0", color: "#F4F4F5", fontSize: 13 }}>{value}</td>
                </tr>
              ))}
            </table>

            <a
              href={dashboardUrl}
              style={{ display: "inline-block", backgroundColor: accentColor, color: "#fff", fontSize: 14, fontWeight: 600, padding: "12px 28px", borderRadius: 10, textDecoration: "none" }}
            >
              View in dashboard
            </a>
          </Section>

          <Hr style={{ borderColor: "rgba(255,255,255,0.06)", margin: "24px 0" }} />
          <Text style={{ margin: 0, fontSize: 11, color: "#4B5563", textAlign: "center" }}>
            Sent by{" "}
            <Link href="https://qwikly.co.za" style={{ color: accentColor, textDecoration: "none" }}>
              Qwikly
            </Link>{" "}
            for {businessName}
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderLeadNotificationEmail(props: LeadNotificationEmailProps): Promise<string> {
  return render(React.createElement(LeadNotificationEmail, props));
}
