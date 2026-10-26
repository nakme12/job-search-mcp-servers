// Shared across every job-search MCP server in this repo.
// Multi-layer strict filter: Title Whitelist, Non-Stack Blacklist, Senior Regex, Experience Barrier.

export const SENIOR_WORD = /\b(senior|sr\.?|lead|staff|principal|architect|head of|manager|director|tech lead|engineering manager|team lead|vp|vice president)\b/i;

export const NON_STACK_WORD = /\b(recruiter|recruiting|talent acquisition|hr coordinator|sourcer|linux kernel|c\+\+|rust|embedded|hardware|firmware|devops|site reliability|sre|security engineer|brand designer|graphic designer|copywriter|translator|linguist|ios|android|mobile developer|flutter developer|react native)\b/i;

export const POSITIVE_FRONTEND_WORD = /\b(frontend|front-end|front end|react|react\.js|reactjs|next\.js|nextjs|javascript|typescript|web developer|web engineer|web development|ui developer|ui engineer|ui\/ux developer|full stack|fullstack|mern|product engineer|software engineer|software developer)\b/i;

export function detectMinYearsExperience(text) {
  if (!text) return null;
  const years = [];

  // 1. Ranges: "0-4 years", "1 to 3 yrs", "2-5 years" -> extracts lower bound
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:years?|yrs?|yoe)?\s*(?:-|to|–|—)\s*(\d+(?:\.\d+)?)\s*(?:years?|yrs?|yoe)/gi)) {
    years.push(parseFloat(m[1]));
  }

  // 2. Plus syntax: "3+ years", "5+ Years of experience", "3+ YOE", "4+ yrs"
  for (const m of text.matchAll(/(\d+(?:\.\d+)?)\s*\+\s*(?:years?|yrs?|yoe)/gi)) {
    years.push(parseFloat(m[1]));
  }

  // 3. Minimum / at least: "minimum 3 years", "at least 3 years", "min. 3 years"
  for (const m of text.matchAll(/(?:minimum|at least|min\.?)\s*(?:of\s*)?(\d+(?:\.\d+)?)\s*\+?\s*(?:years?|yrs?|yoe)/gi)) {
    years.push(parseFloat(m[1]));
  }

  // 4. Standalone with explicit experience context (prevents false positive on company age like "in business for 10 years"):
  // e.g. "3 years of experience", "3 years experience", "3+ YOE", "requires 3 yrs"
  for (const m of text.matchAll(/(?:require[s]?|with|have)?\s*(\d+(?:\.\d+)?)\s*(?:yoe|years?(?:'|\s+of)?\s+(?:relevant\s+)?experience)/gi)) {
    years.push(parseFloat(m[1]));
  }

  return years.length ? Math.min(...years) : null;
}

export function looksSenior(title, description) {
  // Title-First Seniority: Drop if title is explicitly Senior / Lead / Staff / Architect / Principal / Manager
  if (SENIOR_WORD.test(title || "")) return true;
  // If description explicitly specifies "Senior Developer required" or "Lead Developer role"
  if (/\b(senior developer|sr\. developer|lead developer|lead engineer|principal engineer|architect role|engineering manager)\b/i.test(description || "")) {
    return true;
  }
  return false;
}

export function isNonStack(title, description) {
  return NON_STACK_WORD.test(title || "");
}

export function isPositiveFrontendMatch(title) {
  return POSITIVE_FRONTEND_WORD.test(title || "");
}

/**
 * @param {object} job
 * @param {string} job.title
 * @param {string} [job.description]
 * @param {number|null} [job.structuredMinYears]
 * @param {string|null} [job.structuredSeniorityLabel]
 * @param {number} maxYearsExperience
 * @param {boolean} excludeSeniorTitles
 * @returns {{ detected_min_years_experience: number|null, structured_min_years_experience: number|null, looks_senior: boolean, is_non_stack: boolean, passes_whitelist: boolean, exclude: boolean }}
 */
export function evaluateExperience(job, maxYearsExperience = 2, excludeSeniorTitles = true) {
  const combinedText = `${job.title || ""} ${job.description || ""}`;
  const regexMinYears = detectMinYearsExperience(combinedText);
  const structuredMinYears = job.structuredMinYears ?? null;
  const structuredSeniorityLabel = (job.structuredSeniorityLabel || "").toLowerCase();

  const regexSenior = looksSenior(job.title, job.description);
  const structuredSenior = /senior|staff|principal|c_level|executive|lead/.test(structuredSeniorityLabel);
  const looks_senior = regexSenior || structuredSenior;

  const is_non_stack = isNonStack(job.title, job.description);
  const passes_whitelist = isPositiveFrontendMatch(job.title);

  const candidates = [regexMinYears, structuredMinYears].filter((v) => v !== null && v !== undefined);
  const strictestMinYears = candidates.length ? Math.max(...candidates) : null;

  const exclude =
    !passes_whitelist ||
    is_non_stack ||
    (excludeSeniorTitles && looks_senior) ||
    (strictestMinYears !== null && strictestMinYears > maxYearsExperience);

  return {
    detected_min_years_experience: regexMinYears,
    structured_min_years_experience: structuredMinYears,
    looks_senior,
    is_non_stack,
    passes_whitelist,
    exclude,
  };
}
