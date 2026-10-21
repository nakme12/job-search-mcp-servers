/**
 * UNIVERSAL JOB AUDITOR & FRESHNESS GATEKEEPER
 * 
 * Programmatic Checks Before ANY Form Interaction:
 * 1. Freshness Gate: Discards jobs posted > 10 days ago or explicit 2024/2025 dates.
 * 2. Experience Ceiling Gate: Discards jobs requiring 3+, 4+, 5+, Senior, Lead, Architect.
 * 3. Stack Gate: Discards Mobile, Flutter, React Native, Python, DevOps.
 * 
 * Returns { passed: true/false, reason: string, details: object }
 */

function auditJobText(fullText, title = '') {
  const combined = (title + ' ' + fullText).toLowerCase();

  // 1. HARD BANNED ROLES
  const bannedKeywords = [
    'react native', 'flutter', 'android', 'ios', 'mobile app', 'python developer', 
    'devops', 'data engineer', 'data entry', 'delivery executive', 'delivery consultant',
    'hardware design', 'hardware engineer', 'telecaller', 'bpo', 'sales executive'
  ];
  for (const kw of bannedKeywords) {
    if (combined.includes(kw) && !combined.includes('react.js') && !combined.includes('reactjs')) {
      return { passed: false, reason: `HARD_BAN_ROLE: Contains ${kw}` };
    }
  }

  // 2. HARD BANNED SENIORITY
  const bannedSeniority = ['senior', 'lead developer', 'tech lead', 'principal', 'architect', 'staff engineer', 'sr. developer', 'sr developer'];
  for (const s of bannedSeniority) {
    // Only check if it appears in title or prominent qualifications
    if (title.toLowerCase().includes(s)) {
      return { passed: false, reason: `SENIORITY_OVER_CEILING: Title contains ${s}` };
    }
  }

  // 3. YOE CEILING (Strict 0-2 / 0-3 YOE)
  // Allowed: 0-1, 0-2, 0-3, 1-2, 1-3.
  // Rejected: 3+, 3-5, 4+, 5+, 4-6, minimum 3 years.
  const yoeOverRegex = /(\b[3-9]\b|\b1[0-9]\b)\s*(\+|\-|to)\s*[3-9]\d*\s*(years|yrs|year)/i;
  const yoeOverMatch = fullText.match(yoeOverRegex);
  if (yoeOverMatch) {
    // Edge case exception: If string contains "0 to 3", "0 to 4", "1 to 4", it's ALLOWED for candidate (1.5 YOE)!
    const isBroadAllowed = /\b[0-2]\s*(\-|to)\s*[3-5]\s*(years|yrs|year)/i.test(yoeOverMatch[0]);
    if (!isBroadAllowed) {
      return { passed: false, reason: `YOE_OVER_CEILING: Matched "${yoeOverMatch[0]}"` };
    }
  }

  // Check explicit 3+ years / 4+ yrs
  const plusYoeRegex = /(\b[3-9]\b|\b1[0-9]\b)\+\s*(years|yrs|year)/i;
  const plusMatch = fullText.match(plusYoeRegex);
  if (plusMatch) {
    return { passed: false, reason: `YOE_OVER_CEILING: Matched "${plusMatch[0]}"` };
  }

  // Also check explicit "minimum 3 years" or "min 3 years"
  const minYearsRegex = /(minimum|min|at least)\s*(\b[3-9]\b|\b1[0-9]\b)\s*(years|yrs)/i;
  const minMatch = fullText.match(minYearsRegex);
  if (minMatch) {
    return { passed: false, reason: `YOE_OVER_CEILING: Matched "${minMatch[0]}"` };
  }

  // 4. SALARY & STIPEND FLOOR GATE (Rule 82)
  // Candidate Floor: Min ₹3.0 LPA or Min ₹20,000/month.
  // Reject: unpaid, ₹3000-10000, ₹0.1L-₹0.6L, 1-2 LPA.
  const lowLakhsRegex = /(?:₹\s*|\b)0\.[1-9]\s*(?:L|Lacs|Lakhs)/i;
  const lowLakhsMatch = fullText.match(lowLakhsRegex);
  if (lowLakhsMatch) {
    return { passed: false, reason: `SALARY_BELOW_FLOOR: Matched "${lowLakhsMatch[0]}" (< 1 LPA)` };
  }

  const lowRangeLakhsRegex = /(?:₹\s*)?(?:[0-2](?:\.[0-9]+)?|\d{1,2}(?:,\d{3})+)\s*(?:L|Lacs|Lakhs)?\s*(?:PA)?\s*-\s*(?:₹\s*)?([0-2](?:\.[0-9]+)?)\s*(?:L|Lacs|Lakhs)/i;
  const lowRangeMatch = fullText.match(lowRangeLakhsRegex);
  if (lowRangeMatch) {
    return { passed: false, reason: `SALARY_BELOW_FLOOR: Matched "${lowRangeMatch[0]}" (< 3.0 LPA)` };
  }

  const lowMonthRegex = /(?:₹\s*)?([1-9]\d{2,3}|1[0-5]\d{3})\s*(?:-\s*₹?\s*([1-9]\d{2,3}|1[0-9]\d{3}))?\s*\/\s*(?:mo|month)/i;
  const lowMonthMatch = fullText.match(lowMonthRegex);
  if (lowMonthMatch) {
    return { passed: false, reason: `STIPEND_BELOW_FLOOR: Matched "${lowMonthMatch[0]}" (< ₹20,000/mo)` };
  }

  const unpaidRegex = /\b(unpaid\s*internship|unpaid\s*training|0\s*stipend|no\s*stipend)\b/i;
  const unpaidMatch = fullText.match(unpaidRegex);
  if (unpaidMatch) {
    return { passed: false, reason: `UNPAID_JOB: Matched "${unpaidMatch[0]}"` };
  }

  // 5. STALE DATE GATE
  // Flags dates like: posted in 2021, 2022, 2023, 2024, 2025, 30+ days ago, 2 months ago, etc.
  const staleRegex = /(?:posted|date posted|published)\s*[:\-]?\s*([^\n\r•|]{2,35})/i;
  const staleMatch = fullText.match(staleRegex);
  if (staleMatch) {
    const dStr = staleMatch[1].toLowerCase();
    const hasOldYear = /\b(19\d\d|200\d|201\d|202[0-5])\b/.test(dStr);
    const hasOldTime = /months?\s*ago|30\+\s*days\s*ago|[2-9]\+?\s*weeks?\s*ago/i.test(dStr);
    if (hasOldYear || hasOldTime) {
      return { passed: false, reason: `STALE_POSTING: Matched "${staleMatch[0].trim()}"` };
    }
  }

  return { passed: true, reason: 'AUDIT_PASSED_CLEAN' };
}

module.exports = { auditJobText };
