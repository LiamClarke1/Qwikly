import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase-server";
import { StatusPill } from "@/components/pipeline-dash/StatusPill";
import { prospectStatusTone } from "@/components/pipeline-dash/status-tones";
import { SiteRecon, type SiteReconData } from "@/components/pipeline-dash/SiteRecon";
import { OutreachChannels } from "@/components/pipeline-dash/OutreachChannels";
import { QuickDetails } from "@/components/pipeline-dash/QuickDetails";
import { ICPContext } from "@/components/pipeline-dash/ICPContext";
import { QuickActions } from "@/components/pipeline-dash/QuickActions";
import { ICEBREAKER_TEMPLATE, renderCadenceEmail } from "@/lib/outreach/cadence";

export const dynamic = "force-dynamic";

interface ProspectRow {
  id: string;
  business_id: string | null;
  campaign_id: string | null;
  first_name: string | null;
  last_name: string | null;
  title: string | null;
  company: string | null;
  industry: string | null;
  employees: number | null;
  city: string | null;
  country: string | null;
  email: string | null;
  email_verified: boolean | null;
  linkedin_url: string | null;
  intent_signals: string[] | null;
  enrichment_score: number | null;
  status: string | null;
  source: string | null;
  icp_match: Record<string, unknown> | null;
  created_at: string | null;
}

// Soft-fail load. Returns null on any error so the page can show notFound.
async function loadProspect(id: string): Promise<ProspectRow | null> {
  try {
    const db = supabaseAdmin();
    const { data, error } = await db
      .from("pipeline_prospects")
      .select(
        "id, business_id, campaign_id, first_name, last_name, title, company, industry, employees, city, country, email, email_verified, linkedin_url, intent_signals, enrichment_score, status, source, icp_match, created_at",
      )
      .eq("id", id)
      .maybeSingle();
    if (error) return null;
    return (data as ProspectRow) || null;
  } catch {
    return null;
  }
}

async function loadOwnerName(businessId: string | null): Promise<string> {
  if (!businessId) return "Liam";
  try {
    const db = supabaseAdmin();
    const { data } = await db
      .from("businesses")
      .select("owner_first_name")
      .eq("id", businessId)
      .maybeSingle();
    const name = (data as { owner_first_name?: string } | null)?.owner_first_name;
    return name && name.trim() ? name.trim() : "Liam";
  } catch {
    return "Liam";
  }
}

function readIcpString(
  icp: Record<string, unknown> | null,
  key: string,
): string | null {
  if (!icp) return null;
  const v = icp[key];
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function readIcpNumber(
  icp: Record<string, unknown> | null,
  key: string,
): number | null {
  if (!icp) return null;
  const v = icp[key];
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

// enrichment_score is 0 to 100, the visual is 1 to 10. Clamp + round.
function toTenScore(score: number | null): number | null {
  if (score === null || score === undefined || !Number.isFinite(score)) return null;
  const ten = Math.round(score / 10);
  if (ten < 1) return 1;
  if (ten > 10) return 10;
  return ten;
}

function scoreBadgeClass(score: number | null): string {
  // Mirror Mission Control's terracotta circle for high-score prospects, fading
  // to muted tones for low ones.
  if (score === null) return "bg-[#F4EEE4] text-ink-500";
  if (score >= 9) return "bg-accent text-white";
  if (score >= 7) return "bg-[#FCEEE6] text-[#A2421F]";
  if (score >= 5) return "bg-[#FAEFD8] text-[#B8770E]";
  return "bg-[#F4EEE4] text-ink-500";
}

function displayName(row: ProspectRow): string {
  const company = (row.company || "").trim();
  if (company) return company;
  const full = [row.first_name, row.last_name].filter(Boolean).join(" ").trim();
  return full || "Unknown business";
}

function buildOutreach(row: ProspectRow, ownerName: string = "Liam") {
  const firstName = (row.first_name || "").trim();
  const business = (row.company || "").trim() || "your business";
  const city = (row.city || "").trim();
  const cityForSubject = city || "Local";

  const subject = `${cityForSubject} enquiry, quick one`;

  const icebreakerLine =
    readIcpString(row.icp_match, "unique_hook") ||
    `I had a look at ${business} and a few things jumped out.`;

  const painPoint = city
    ? `you might be losing a handful of ${city} enquiries every week, especially after hours`
    : "you might be losing a handful of enquiries every week, especially after hours";

  const rendered = renderCadenceEmail(ICEBREAKER_TEMPLATE, {
    firstName: firstName || "there",
    businessName: business,
    icebreaker: icebreakerLine,
    painPoint,
    senderFirstName: ownerName,
  });

  const emailBody = rendered.body;

  const whatsappBody = [
    `Hi ${firstName || "there"}, ${ownerName} here from Qwikly.`,
    "",
    `Quick one, I had a look at ${business} and noticed a few things on the site.`,
    "",
    "We help South African businesses catch after hours enquiries in under a minute. Worth a 90 second walkthrough?",
  ].join("\n");

  const linkedinBody = [
    `Hi ${firstName || "there"},`,
    "",
    `${business} popped up while I was looking at ${cityForSubject} operators. ${icebreakerLine}`,
    "",
    "Open to a quick chat about catching after hours leads? Happy to send a short video first if easier.",
  ].join("\n");

  const callBullets = [
    `Hi ${firstName || "there"}, this is ${ownerName} from Qwikly. Got 30 seconds?`,
    `I help ${business} style operators catch after hours enquiries in under a minute, no setup fees, no lock-in.`,
    "Worth me sending a 90 second walkthrough, or would a quick call this week work better?",
  ];

  return { subject, emailBody, whatsappBody, linkedinBody, callBullets };
}

export default async function ProspectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const row = await loadProspect(params.id);
  if (!row) notFound();

  const score10 = toTenScore(row.enrichment_score);
  const rating = readIcpNumber(row.icp_match, "rating");
  const reviewCount = readIcpNumber(row.icp_match, "reviews_count");

  const websiteFromIcp = readIcpString(row.icp_match, "website");
  const phoneFromIcp = readIcpString(row.icp_match, "phone");
  const suburbFromIcp = readIcpString(row.icp_match, "suburb");

  const heroTitle = displayName(row);

  // site_recon fields are nested inside icp_match.site_recon, not at top level
  const siteReconObj =
    row.icp_match?.site_recon && typeof row.icp_match.site_recon === "object"
      ? (row.icp_match.site_recon as Record<string, unknown>)
      : null;

  const siteReconData: SiteReconData = {
    id: row.id,
    title: readIcpString(siteReconObj, "title"),
    h1: readIcpString(siteReconObj, "h1"),
    metaDescription: readIcpString(siteReconObj, "meta_description"),
    specialism: row.industry,
    heroText: readIcpString(siteReconObj, "hero_text"),
    uniqueHook: readIcpString(row.icp_match, "unique_hook"),
    scrapedFromUrl: row.linkedin_url || websiteFromIcp,
    scrapedFromLabel: row.linkedin_url || websiteFromIcp || null,
    verified: !!row.email_verified,
    hasReconData:
      !!readIcpString(siteReconObj, "title") ||
      !!readIcpString(siteReconObj, "h1") ||
      !!readIcpString(siteReconObj, "meta_description") ||
      !!readIcpString(siteReconObj, "hero_text"),
  };

  const ownerName = await loadOwnerName(row.business_id);
  const outreach = buildOutreach(row, ownerName);

  const firstName = (row.first_name || "").trim();
  const firstNameIsAuto = firstName.length === 0;

  const status = (row.status || "new").toLowerCase();
  const locationLine = [
    row.industry,
    [row.city, row.country].filter(Boolean).join(", "),
  ]
    .filter((part) => part && String(part).trim().length > 0)
    .join(", ");

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 pb-5 border-b border-ink/[0.08]">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-start gap-4">
            <span
              className={`shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-full text-[16px] font-mono font-medium ${scoreBadgeClass(
                score10,
              )}`}
              aria-label={score10 !== null ? `Score ${score10} of 10` : "No score"}
            >
              {score10 !== null ? score10 : ","}
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-[32px] md:text-[38px] leading-[1.05] tracking-tight text-ink">
                  {heroTitle}
                </h1>
                {row.email_verified ? (
                  <span
                    title="Email verified"
                    className="inline-flex items-center text-[#1F7A3A]"
                  >
                    <ShieldCheck className="w-5 h-5" />
                  </span>
                ) : null}
              </div>
              <p className="text-[13px] text-ink-500">
                {locationLine || "Pipeline prospect"}
                {rating !== null ? (
                  <span>
                    {" "}
                    , <span className="text-ember">★</span> {rating}
                    {reviewCount !== null ? ` (${reviewCount} reviews)` : ""}
                  </span>
                ) : null}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StatusPill tone={prospectStatusTone(status)}>{status}</StatusPill>
            <Link
              href="/dashboard/pipeline/prospects"
              className="inline-flex items-center gap-1.5 rounded-full bg-white border border-ink/10 text-ink px-3.5 py-1.5 text-[13px] font-medium hover:bg-[#F9F6F2]"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to queue
            </Link>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 flex flex-col gap-6">
          <SiteRecon
            data={siteReconData}
            company={row.company}
            city={row.city}
          />
          <OutreachChannels
            prospectId={row.id}
            firstName={firstName || null}
            firstNameIsAuto={firstNameIsAuto}
            email={row.email}
            phone={phoneFromIcp}
            linkedinUrl={row.linkedin_url}
            emailSubject={outreach.subject}
            emailBody={outreach.emailBody}
            whatsappBody={outreach.whatsappBody}
            linkedinBody={outreach.linkedinBody}
            callBullets={outreach.callBullets}
          />
        </div>

        <aside className="lg:col-span-4 flex flex-col gap-6">
          <QuickDetails
            data={{
              email: row.email,
              phone: phoneFromIcp,
              website: websiteFromIcp,
              suburb: suburbFromIcp || row.city,
              score: score10,
            }}
          />
          <ICPContext industry={row.industry} />
          <QuickActions prospectId={row.id} />
        </aside>
      </div>
    </div>
  );
}
