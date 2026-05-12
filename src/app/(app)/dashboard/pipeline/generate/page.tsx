import { redirect } from "next/navigation";

// Superseded by the ICP setup wizard at /dashboard/pipeline/setup.
// This redirect keeps any stale bookmarks working.
export const dynamic = "force-dynamic";

export default function GeneratePipelinePage() {
  redirect("/dashboard/pipeline/setup");
}
