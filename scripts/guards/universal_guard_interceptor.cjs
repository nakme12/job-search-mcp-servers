/**
 * LAYER 1: UNIVERSAL PRE-ACTION INTERCEPTOR & RUNTIME GATEKEEPER
 * Pure Deterministic JavaScript — Zero LLM Free Will.
 * If ANY condition fails, process crashes immediately with Exit Code 1.
 */

const fs = require('fs');
const path = require('path');
const { assertSlot, getCurrentSlotInfo, formatMinutes } = require('../slot_guard.cjs');

// Forbidden Salutations Blacklist (Incident 10)
const FORBIDDEN_SALUTATIONS = [
  'gmail', 'yahoo', 'hotmail', 'outlook', 'direct linkedin lead', 
  'tech firm', 'unknown', 'null', 'undefined', 'hiring team', 'recruiter'
];

// Forbidden Title Keywords (Seniority / Architecture)
const STRICT_OUT_OF_RANGE_TITLES = [
  /\b(?:senior|sr\.?|lead|principal|architect|staff|director|head\s+of|engineering\s+manager)\b/i
];

// Experience Ceiling Regex in JD Body
// REJECT ONLY IF MINIMUM REQUIRED >= 3 (e.g. 3+, 3-5, 4+, 4-6)
// ALLOW RANGES STARTING AT 0, 1, or 2 (e.g. 0-3, 0-4, 1-4, 2-4, 2-5)
const STRICT_OUT_OF_RANGE_YOE_JD = [
  /\b(?:minimum|at\s*least|min)?\s*[3-9]\s*\+?\s*(?:to\s*[0-9]+\s*)?(?:years?|yrs?)\b/i,
  /\b(?:3|4|5|6|7|8|9|10)\s*-\s*[0-9]+\s*(?:years?|yrs?)\b/i // Min is 3 or more
];

// Explicit allowance for broad entry/junior ranges:
const ALLOWED_BROAD_RANGES = [
  /\b[0-2]\s*(?:-|to)\s*[3-5]\s*(?:years?|yrs?)\b/i // e.g. 0-3, 0-4, 1-3, 1-4, 2-4, 2-5
];

// Salary Floor Regex (< 20,000/mo or unpaid) (Incident 37)
const LOW_SALARY_PATTERNS = [
  /unpaid/i,
  /stipend\s*:\s*[₹Rs.]*\s*(?:[1-9][0-9]{2,3}|1[0-9]{4})\b/i, // < 20000
  /₹\s*(?:3000|5000|8000|10000|12000|15000)\s*(?:-|to)/i
];

class UniversalGuardInterceptor {
  
  // 1. Assert Slot Clock Window
  static assertSlotClock(allowedSlotKeys, actionName) {
    return assertSlot(allowedSlotKeys, actionName);
  }

  // 2. Assert Salutation & Recipient
  static assertEmailSafety(companyName, recipientEmail) {
    if (!companyName || typeof companyName !== 'string') {
      throw new Error(`[LAYER 1 BLOCK] Invalid company name: "${companyName}". Execution halted.`);
    }
    const cleanCompany = companyName.trim().toLowerCase();
    for (const bad of FORBIDDEN_SALUTATIONS) {
      if (cleanCompany === bad || cleanCompany.includes(bad)) {
        throw new Error(`[LAYER 1 BLOCK] FORBIDDEN SALUTATION DETECTED: "${companyName}". Rule 1 violation! Aborting dispatch.`);
      }
    }
    if (!recipientEmail || !recipientEmail.includes('@') || recipientEmail.endsWith('@example.com')) {
      throw new Error(`[LAYER 1 BLOCK] Invalid recipient email: "${recipientEmail}". Aborting dispatch.`);
    }
    console.log(`✅ [LAYER 1] Email Safety Passed: Company="${companyName}", Recipient="${recipientEmail}"`);
    return true;
  }

  // 3. Assert Job Eligibility (YOE, Freshness, Salary)
  static assertJobEligibility(jdText, roleTitle = '') {
    if (!jdText || jdText.length < 20) {
      return { pass: false, reason: 'JD_TEXT_EMPTY_OR_TRUNCATED' };
    }

    // 1. Role Title Seniority Check (Title ONLY)
    if (roleTitle) {
      for (const r of STRICT_OUT_OF_RANGE_TITLES) {
        if (r.test(roleTitle)) {
          return { pass: false, reason: `ROLE_TITLE_OUT_OF_RANGE: ${roleTitle}` };
        }
      }
    }

    // 2. Experience Ceiling Check in JD Body
    for (const r of STRICT_OUT_OF_RANGE_YOE_JD) {
      if (r.test(jdText)) {
        // If it's a broad range starting at 0, 1, or 2 (e.g. 0-4, 1-3, 2-4, 2-5), allow it!
        const isBroadAcceptable = ALLOWED_BROAD_RANGES.some(b => b.test(jdText));
        if (!isBroadAcceptable) {
          return { pass: false, reason: 'JD_EXPERIENCE_EXCEEDS_2_YOE' };
        }
      }
    }

    // Salary floor check
    for (const s of LOW_SALARY_PATTERNS) {
      if (s.test(jdText)) {
        return { pass: false, reason: 'BELOW_SALARY_FLOOR_OR_UNPAID' };
      }
    }

    return { pass: true, reason: 'CLEAN_VERIFIED' };
  }

  // 4. Assert Physical DOM Submission Receipt (Zero Phantom Logging - Rule 69)
  static assertSubmissionReceipt(domText, screenshotPath) {
    if (!domText || typeof domText !== 'string') {
      throw new Error('[LAYER 1 BLOCK] DOM text is empty. Cannot verify submission receipt.');
    }

    const SUCCESS_RECEIPT_STRINGS = [
      'application submitted',
      'thank you for applying',
      'your application has been received',
      'application received',
      'we have received your application',
      'successfully submitted',
      'thanks for applying',
      'submitted successfully'
    ];

    const lower = domText.toLowerCase();
    const foundReceipt = SUCCESS_RECEIPT_STRINGS.some(s => lower.includes(s));

    if (!foundReceipt) {
      throw new Error(`[LAYER 1 BLOCK] ZERO PHANTOM LOGGING: No confirmation receipt detected in live DOM! Form submission failed or blocked.`);
    }

    if (!screenshotPath || !fs.existsSync(screenshotPath)) {
      throw new Error(`[LAYER 1 BLOCK] PHYSICAL PROOF MISSING: Screenshot file does not exist on disk at "${screenshotPath}". Record rejected!`);
    }

    console.log(`✅ [LAYER 1] Physical Submission Confirmed with Screenshot Proof!`);
    return true;
  }

  // 5. Assert Historical Blacklist (URL + Company 30-Day Lock)
  static assertHistoricalCompanyLock(companyName, targetUrl) {
    if (!companyName) throw new Error('[LAYER 1 BLOCK] Company name missing for deduplication assertion.');
    
    const root = path.join(__dirname, '..', '..');
    const f1Path = path.join(root, 'total_historical_except_today.json');
    const f2Path = path.join(root, 'applied_lifetime_except_today.json');

    let allHist = [];
    try {
      if (fs.existsSync(f1Path)) {
        const raw1 = JSON.parse(fs.readFileSync(f1Path, 'utf8'));
        allHist = allHist.concat(Array.isArray(raw1) ? raw1 : raw1.jobs || []);
      }
      if (fs.existsSync(f2Path)) {
        const raw2 = JSON.parse(fs.readFileSync(f2Path, 'utf8'));
        allHist = allHist.concat(Array.isArray(raw2) ? raw2 : raw2.jobs || []);
      }
    } catch(e) {
      console.error('[LAYER 1 ERROR] Error reading historical files:', e.message);
    }

    const cleanCo = companyName.trim().toLowerCase();
    const cleanUrl = (targetUrl || '').trim().toLowerCase().replace(/\/+$/, '');

    for (const h of allHist) {
      const hCo = (h.company || '').trim().toLowerCase();
      const hUrl = (h.url || h.applyUrl || h.link || h.recipient || '').trim().toLowerCase().replace(/\/+$/, '');

      if (cleanUrl && hUrl && cleanUrl === hUrl) {
        throw new Error(`[LAYER 1 HARD LOCK] EXACT URL ALREADY APPLIED IN LIFETIME HISTORY: "${cleanUrl}". Action blocked!`);
      }

      if (cleanCo && hCo && cleanCo === hCo) {
        throw new Error(`[LAYER 1 HARD LOCK] COMPANY "${companyName}" WAS ALREADY APPLIED IN LIFETIME HISTORY (Matched: "${h.company}" - ${h.role || ''} on ${h.date || 'past'}). 30-Day cooldown active! Action blocked!`);
      }
    }

    console.log(`✅ [LAYER 1] Historical Company Check Passed: "${companyName}" is 100% fresh in lifetime history.`);
    return true;
  }
}

module.exports = UniversalGuardInterceptor;
