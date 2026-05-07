import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://www.qwikly.co.za";
  const now = new Date();

  return [
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
}
