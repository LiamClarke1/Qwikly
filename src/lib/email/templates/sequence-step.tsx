import {
  Html, Head, Preview, Body, Container, Section,
  Text, Heading, Button, Hr, Link,
} from "@react-email/components";
import { render } from "@react-email/render";
import React from "react";

interface SequenceStepEmailProps {
  businessName: string;
  accentColor?: string;
  previewText: string;
  heading: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}

export function SequenceStepEmail({
  businessName,
  accentColor = "#E85A2C",
  previewText,
  heading,
  body,
  ctaText,
  ctaUrl,
}: SequenceStepEmailProps) {
  return (
    <Html lang="en">
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={{ backgroundColor: "#07080B", fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif", margin: 0, padding: 0 }}>
        <Container style={{ maxWidth: 520, margin: "0 auto", padding: "40px 16px" }}>

          {/* Logo */}
          <Text style={{ fontSize: 22, fontWeight: 700, color: "#F4F4F5", letterSpacing: "-0.5px", marginBottom: 32 }}>
            Qwikly<span style={{ color: accentColor }}>.</span>
          </Text>

          {/* Card */}
          <Section style={{ backgroundColor: "#0D111A", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 16, padding: 32 }}>
            <Text style={{ margin: "0 0 4px", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: accentColor }}>
              {businessName}
            </Text>
            <Heading as="h1" style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#F4F4F5", letterSpacing: "-0.3px" }}>
              {heading}
            </Heading>
            <Text style={{ margin: "0 0 24px", fontSize: 14, color: "#9CA3AF", lineHeight: "1.6" }}>
              {body}
            </Text>

            {ctaText && ctaUrl && (
              <Button
                href={ctaUrl}
                style={{ backgroundColor: accentColor, color: "#fff", fontSize: 14, fontWeight: 600, padding: "12px 28px", borderRadius: 10, textDecoration: "none", display: "inline-block" }}
              >
                {ctaText}
              </Button>
            )}
          </Section>

          <Hr style={{ borderColor: "rgba(255,255,255,0.06)", margin: "24px 0" }} />

          {/* Footer */}
          <Text style={{ margin: 0, fontSize: 11, color: "#4B5563", textAlign: "center" }}>
            Powered by{" "}
            <Link href="https://qwikly.co.za" style={{ color: accentColor, textDecoration: "none" }}>
              Qwikly
            </Link>
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export async function renderSequenceStepEmail(props: SequenceStepEmailProps): Promise<string> {
  return render(React.createElement(SequenceStepEmail, props));
}
