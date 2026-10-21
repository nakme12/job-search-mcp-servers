/**
 * MASTER PIPELINE GUARD & CIRCUIT BREAKER
 * 
 * Auto-enforces all 25 past incident fixes at the code level.
 * Any script or action violating any rule throws hard exit (process.exit(1)).
 */

const fs = require('fs');
const path = require('path');

const PROFILE_PATH = path.resolve(__dirname, '../../candidate_screening_profile.json');

// BANNED Salutations / Companies (Incident 10)
const BANNED_SALUTATIONS = new Set([
  'gmail', 'yahoo', 'hotmail', 'outlook', 'direct linkedin lead',
  'tech firm', 'unknown', 'null', 'undefined', 'hiring team', 'recruiter'
]);

// CANONICAL PROFILE CONSTANTS (Incident 22)
const CANONICAL = {
  CURRENT_CTC_LPA: "2.16",
  CURRENT_CTC_RAW: "216000",
  EXPECTED_CTC_LPA: "4.65",
  EXPECTED_CTC_RAW: "465000",
  NOTICE_PERIOD_DAYS: "15",
  TOTAL_EXP_DEFAULT: "1.5",
  TOTAL_EXP_INTEGER: "2",
  LOCATION: "Indore",
  PHONE_COUNTRY_CODE: "+91",
  EDUCATION: "B.Tech in Computer Science and Engineering"
};

// 1. Guard Email Salutation & Company Name (Incident 10)
function guardEmailSalutation(companyName, recipientEmail) {
  if (!companyName || typeof companyName !== 'string') {
    throw new Error(`[GUARD FAILURE] Company name is empty for recipient: ${recipientEmail}`);
  }
  const cleanComp = companyName.trim().toLowerCase();
  if (BANNED_SALUTATIONS.has(cleanComp) || cleanComp.includes('gmail') || cleanComp.includes('yahoo')) {
    console.error(`\n🚨 ==============================================================`);
    console.error(`🛑 HARD BLOCK: BANNED SALUTATION DETECTED! (Incident 10 Enforcement)`);
    console.error(`- Attempted Company Name: "${companyName}"`);
    console.error(`- Recipient Email:        "${recipientEmail}"`);
    console.error(`- Banned Strings:         ${Array.from(BANNED_SALUTATIONS).join(', ')}`);
    console.error(`🚨 ==============================================================\n`);
    process.exit(1);
  }
  return true;
}

// 2. Guard Screening Profile Data (Incident 22)
function guardScreeningInput(fieldName, valueProvided) {
  const normVal = String(valueProvided).trim().toLowerCase();
  
  if (fieldName === 'current_ctc' && !normVal.includes('2.16') && !normVal.includes('216000')) {
    console.error(`🛑 HARD BLOCK: Current CTC mismatch! Provided: "${valueProvided}", Canonical: "2.16 LPA"`);
    process.exit(1);
  }
  if (fieldName === 'expected_ctc' && !normVal.includes('4.65') && !normVal.includes('465000')) {
    console.error(`🛑 HARD BLOCK: Expected CTC mismatch! Provided: "${valueProvided}", Canonical: "4.65 LPA"`);
    process.exit(1);
  }
  if (fieldName === 'notice_period' && !normVal.includes('15') && !normVal.includes('immediate')) {
    console.error(`🛑 HARD BLOCK: Notice Period mismatch! Provided: "${valueProvided}", Canonical: "15 Days"`);
    process.exit(1);
  }
  return true;
}

// 3. Guard YOE and Freshness on Destination DOM (Incidents 1, 5, 9, 12, 15, 16)
function guardDestinationDom(domHtml, url) {
  if (!domHtml) {
    return { valid: false, reason: "FETCH_FAILED" };
  }
  
  // Stale check (> 7-10 days / months / years)
  if (/[2-9]\s*months?\s*ago|1\s*year\s*ago|202[0-4]|posted\s*30\+\s*days\s*ago/i.test(domHtml)) {
    return { valid: false, reason: "STALE_JOB_DETECTED_IN_DOM" };
  }

  // 3+ YOE Hard Barrier
  if (/([3-9]|\d{2,})\+?\s*years?\s*(?:of)?\s*experience/i.test(domHtml) ||
      /experience[:\s]+[3-9]\s*-\s*\d+\s*years?/i.test(domHtml) ||
      /\b(senior|lead|principal|architect|staff)\b/i.test(domHtml)) {
    return { valid: false, reason: "EXPERIENCE_EXCEEDS_2_YOE_IN_DOM" };
  }

  // Inactive / Closed check
  if (/no longer accepting|job.*expired|position.*filled|this job.*closed|not available|removed/i.test(domHtml)) {
    return { valid: false, reason: "JOB_CLOSED_OR_EXPIRED" };
  }

  return { valid: true };
}

// 4. Guard Proof Before Logging Applied (Incidents 3, 4, 19)
function guardProofBeforeLog(entry, screenshotPath) {
  if (!entry || !entry.company || !entry.url) {
    throw new Error(`[GUARD FAILURE] Malformed entry to log.`);
  }

  // If portal submission, must have screenshot file existing on disk
  if (entry.channel !== 'Email' && screenshotPath) {
    if (!fs.existsSync(screenshotPath)) {
      console.error(`\n🚨 ==============================================================`);
      console.error(`🛑 HARD BLOCK: PHANTOM LOGGING DETECTED! (Incident 19 Enforcement)`);
      console.error(`- Screenshot proof missing on disk: ${screenshotPath}`);
      console.error(`- Entry: ${entry.company} | ${entry.role}`);
      console.error(`🚨 ==============================================================\n`);
      process.exit(1);
    }
  }

  // Check confirmation string presence
  if (entry.channel !== 'Email' && (!entry.confirmation_text || entry.confirmation_text.length < 3)) {
    console.error(`🛑 HARD BLOCK: Missing post-submit confirmation text proof in entry!`);
    process.exit(1);
  }

  return true;
}

// 5. Guard Clock / Slot Timetable (Incidents 6, 14, 25)
const slotGuard = require('../slot_guard.cjs');

module.exports = {
  guardEmailSalutation,
  guardScreeningInput,
  guardDestinationDom,
  guardProofBeforeLog,
  assertSlot: slotGuard.assertSlot,
  getCurrentSlotInfo: slotGuard.getCurrentSlotInfo,
  CANONICAL
};
