// Shared across every job-search MCP server in this repo, alongside experience-filter.js.
// Two rules: drop internships, and drop postings older than maxAgeDays unless a
// source-provided "reposted" date shows it's actually still active.

const INTERNSHIP_WORD = /\b(intern(ship)?|trainee)\b/i;

export function isInternship(title, employmentType) {
  if (INTERNSHIP_WORD.test(title || "")) return true;
  if (employmentType && /intern/i.test(String(employmentType))) return true;
  return false;
}

// Handles both absolute dates ("2026-08-05", ISO datetimes, unix-ms timestamps)
// and Google Jobs' relative strings ("2 days ago", "3 weeks ago").
export function ageInDays(dateOrRelative, now = new Date()) {
  if (dateOrRelative === null || dateOrRelative === undefined || dateOrRelative === "") return null;

  if (typeof dateOrRelative === "string") {
    const rel = dateOrRelative.match(/(\d+)\s*(hour|day|week|month|year)s?\s*ago/i);
    if (rel) {
      const n = parseInt(rel[1], 10);
      const unit = rel[2].toLowerCase();
      const daysPerUnit = { hour: 1 / 24, day: 1, week: 7, month: 30, year: 365 };
      return n * daysPerUnit[unit];
    }
  }

  const d = typeof dateOrRelative === "number" ? new Date(dateOrRelative) : new Date(dateOrRelative);
  if (isNaN(d.getTime())) return null;
  return (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
}

/**
 * @param {object} job
 * @param {string} job.title
 * @param {string} [job.employmentType]
 * @param {string|number|null} [job.postedDate] - the posting's original date, in whatever format the source gives
 * @param {string|number|null} [job.repostedDate] - if the source tracks reposts, its most recent repost date
 * @param {number} maxAgeDays
 * @param {boolean} excludeInternships
 */
export function evaluateFreshness(job, maxAgeDays, excludeInternships) {
  const is_internship = isInternship(job.title, job.employmentType);

  const effectiveDate = job.repostedDate ?? job.postedDate ?? null;
  const age_days = ageInDays(effectiveDate);
  // Missing/unparseable date: don't penalize the job for a source that simply
  // didn't provide one - only exclude on age when we actually know it's stale.
  const is_stale = age_days !== null && age_days > maxAgeDays;

  const exclude = (excludeInternships && is_internship) || is_stale;

  return {
    is_internship,
    age_days: age_days !== null ? Math.round(age_days * 10) / 10 : null,
    is_stale,
    exclude,
  };
}
