// Shared across every job-search MCP server in this repo.
//
// Most source APIs either have no experience-level field at all, or a
// self-reported one that can be wrong (HireBase once labelled a 3-5yr role
// "Junior/Associate"). This scans the actual title/description text as an
// independent check, and combines it with whatever structured signal the
// source provides - if EITHER says the role is too senior, it's excluded.
export const SENIOR_WORD = /\b(senior|sr\.?|lead|staff|principal|architect|head of|manager|director)\b/i;

export function detectMinYearsExperience(text) {
  if (!text) return null;
  const years = [];
  // "3+ years", "5+ Years of experience"
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*\+\s*years?/gi)) years.push(parseFloat(m[1]));
  // "3-6 years", "3 to 6 years", "3–6 years", "Experience Required: 3 + Years"
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:-|to|–|—)\s*(\d+(?:\.\d+)?)\s*\+?\s*years?/gi)) years.push(parseFloat(m[1]));
  // "minimum 3 years", "at least 3 years", "min. 3 years"
  for (const m of text.matchAll(/(?:minimum|at least|min\.?)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*\+?\s*years?/gi)) years.push(parseFloat(m[1]));
  return years.length ? Math.min(...years) : null;
}

export function looksSenior(title, description) {
  return SENIOR_WORD.test(title || "") || SENIOR_WORD.test(description || "");
}

/**
 * @param {object} job
 * @param {string} job.title
 * @param {string} [job.description]
 * @param {number|null} [job.structuredMinYears] - a YOE-min value already provided by the source API, if any
 * @param {string|null} [job.structuredSeniorityLabel] - a seniority string already provided by the source API, if any
 * @param {number} maxYearsExperience
 * @param {boolean} excludeSeniorTitles
 * @returns {{ detected_min_years_experience: number|null, structured_min_years_experience: number|null, looks_senior: boolean, exclude: boolean }}
 */
export function evaluateExperience(job, maxYearsExperience, excludeSeniorTitles) {
  const regexMinYears = detectMinYearsExperience(`${job.title || ""} ${job.description || ""}`);
  const structuredMinYears = job.structuredMinYears ?? null;
  const structuredSeniorityLabel = (job.structuredSeniorityLabel || "").toLowerCase();

  const regexSenior = looksSenior(job.title, job.description);
  const structuredSenior = /senior|staff|principal|c_level|executive|lead/.test(structuredSeniorityLabel);
  const looks_senior = regexSenior || structuredSenior;

  const candidates = [regexMinYears, structuredMinYears].filter((v) => v !== null && v !== undefined);
  // Use the higher of the two signals for the exclusion check - if either source
  // says "too senior," trust the stricter one rather than averaging it away.
  const strictestMinYears = candidates.length ? Math.max(...candidates) : null;

  const exclude =
    (excludeSeniorTitles && looks_senior) ||
    (strictestMinYears !== null && strictestMinYears > maxYearsExperience);

  return {
    detected_min_years_experience: regexMinYears,
    structured_min_years_experience: structuredMinYears,
    looks_senior,
    exclude,
  };
}
