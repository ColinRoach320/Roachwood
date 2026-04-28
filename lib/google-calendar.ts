import type { Job } from "@/lib/types";

/**
 * Format a date for the Google Calendar `dates=` query param. Google
 * accepts both YYYYMMDD (all-day) and YYYYMMDDTHHmmssZ (timed); jobs
 * are tracked as plain dates, so we use the all-day form. The end
 * date in the all-day form is exclusive — Google treats `dates=
 * 20260501/20260502` as a single-day event on May 1 — so we add one
 * day to whatever Colin set as end_date.
 */
function fmt(date: string): string {
  return date.replace(/-/g, "");
}

function addDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt.toISOString().slice(0, 10);
}

export function googleCalendarUrl(
  job: Pick<Job, "title" | "address" | "description" | "start_date" | "end_date">,
): string | null {
  if (!job.start_date) return null;
  const startIso = job.start_date;
  // If end_date is missing, treat it as a single-day event (start +1).
  const endIsoExclusive = addDay(job.end_date ?? startIso);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: job.title,
    dates: `${fmt(startIso)}/${fmt(endIsoExclusive)}`,
  });
  if (job.description) params.set("details", job.description);
  if (job.address) params.set("location", job.address);

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
