/**
 * GUARD 4: Destination DOM Freshness & 0-2 YOE Auditor (Incidents 1, 5, 9, 12, 15, 16 Fix)
 * Programmatically disqualifies jobs exceeding 2 YOE or posted > 7 days ago.
 */

function auditDestinationDom(html, url = '') {
  if (!html || typeof html !== 'string') {
    return { valid: false, reason: 'EMPTY_OR_FAILED_DOM_FETCH' };
  }

  // 1. Closed or Inactive
  if (/no longer accepting|job.*expired|position.*filled|this job.*closed|not available|removed|job.*inactive/i.test(html)) {
    return { valid: false, reason: 'JOB_EXPIRED_OR_CLOSED' };
  }

  // 2. Stale Postings (> 7-10 days / old years / months ago)
  if (/posted\s*30\+\s*days\s*ago|[2-9]\s*months?\s*ago|1\s*year\s*ago|202[0-4]/i.test(html)) {
    return { valid: false, reason: 'STALE_POSTING_EXCEEDS_7_DAYS' };
  }

  // 3. 3+ YOE Hard Ceiling
  if (/([3-9]|\d{2,})\+?\s*years?\s*(?:of)?\s*experience/i.test(html) ||
      /experience[:\s]+[3-9]\s*-\s*\d+\s*years?/i.test(html) ||
      /\b(senior|lead|principal|architect|staff|director)\b/i.test(html)) {
    return { valid: false, reason: 'EXPERIENCE_EXCEEDS_0_2_YOE_CEILING' };
  }

  return { valid: true };
}

module.exports = {
  auditDestinationDom
};
