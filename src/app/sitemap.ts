import type { MetadataRoute } from "next";
import { getAllNicheSlugs } from "@/lib/niches";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.qwikly.co.za";
  const now = new Date();

  const core: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/connect-your-website`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/get-started`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/contact`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/trust`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    { url: `${base}/trust/popia`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/trust/hosting`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/trust/security`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/status`, lastModified: now, changeFrequency: "daily", priority: 0.4 },
    { url: `${base}/legal/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${base}/legal/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  // New public pages shipped May 2026.
  const newPages: MetadataRoute.Sitemap = [
    { url: `${base}/pipeline`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${base}/case-studies`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${base}/watch`, lastModified: now, changeFrequency: "monthly", priority: 0.7 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
  ];

  // One sitemap entry per niche landing page.
  // Note: individual /case-studies/[slug] entries are intentionally omitted
  // until a real, non-TODO case study is published. The current placeholder
  // (acme-plumbing) is noindex via hasPendingFields, so we keep it out.
  const nichePages: MetadataRoute.Sitemap = getAllNicheSlugs().map((slug) => ({
    url: `${base}/niche/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...core, ...newPages, ...nichePages];
}
