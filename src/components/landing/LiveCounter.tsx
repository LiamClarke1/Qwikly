"use client";

import { useState, useEffect } from "react";

export function LiveCounter() {
  const [jobs, setJobs] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/stats/revenue")
      .then((r) => r.json())
      .then((d) => {
        if (d.jobsThisMonth > 0) setJobs(d.jobsThisMonth);
      })
      .catch(() => {});
  }, []);

  if (!jobs) return null;

  return (
    <p className="mt-4 text-sm text-ink-500 flex items-center gap-2">
      <span className="inline-block w-1.5 h-1.5 rounded-full bg-ember tick" />
      <span className="num font-medium text-ink">{jobs.toLocaleString()}</span>
      {" "}jobs booked through Qwikly this month
    </p>
  );
}
