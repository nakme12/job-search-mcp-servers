/**
 * GUARD 2: Email Salutation & Company Name Enforcer (Incident 10 Fix)
 * Completely blocks "Hi Gmail", "Hi Yahoo", "Hi Outlook", "Hi Direct Lead" etc.
 */

const BANNED_SALUTATIONS = new Set([
  'gmail', 'yahoo', 'hotmail', 'outlook', 'direct linkedin lead',
  'tech firm', 'unknown', 'null', 'undefined', 'hiring team', 'recruiter',
  'company', 'india', 'indore', 'hr'
]);

function assertValidSalutation(companyName, recipientEmail) {
  if (!companyName || typeof companyName !== 'string') {
    console.error(`\n🚨 ==============================================================`);
    console.error(`🛑 HARD BLOCK: COMPANY NAME IS EMPTY OR INVALID!`);
    console.error(`- Recipient Email: "${recipientEmail}"`);
    console.error(`🚨 ==============================================================\n`);
    process.exit(1);
  }

  const clean = companyName.trim().toLowerCase();
  for (const b of BANNED_SALUTATIONS) {
    if (clean === b || clean.includes(b + '.') || clean.includes('@' + b)) {
      console.error(`\n🚨 ==============================================================`);
      console.error(`🛑 HARD BLOCK: BANNED SALUTATION DETECTED! (Incident 10 Enforcement)`);
      console.error(`- Prohibited Company Name: "${companyName}"`);
      console.error(`- Recipient Email:         "${recipientEmail}"`);
      console.error(`- Matched Blacklist Word:  "${b}"`);
      console.error(`🚨 ==============================================================\n`);
      process.exit(1);
    }
  }

  console.log(`✅ [GUARD SALUTATION] Verified company salutation: "Hi ${companyName} Hiring Team,"`);
  return true;
}

module.exports = {
  assertValidSalutation,
  BANNED_SALUTATIONS
};
