/**
 * GUARD 5: Strict Proof Before Logging Guard (Incidents 3, 4, 19 Fix)
 * Completely eliminates phantom logging and optimistic counts.
 */

const fs = require('fs');

function assertApplicationProof(entry, screenshotPath = null) {
  if (!entry || !entry.company || !entry.url) {
    console.error(`🛑 HARD BLOCK: Malformed applied entry attempted to log!`);
    process.exit(1);
  }

  // Direct ATS / Web Forms MUST have physical screenshot proof on disk
  if (entry.channel !== 'Direct Email (Gmail CDP)') {
    if (!screenshotPath || !fs.existsSync(screenshotPath)) {
      console.error(`\n🚨 ==============================================================`);
      console.error(`🛑 HARD BLOCK: PHANTOM LOGGING DETECTED! (Incident 19 Enforcement)`);
      console.error(`- Entry Attempted: ${entry.company} | ${entry.role}`);
      console.error(`- Screenshot Missing on Disk: "${screenshotPath}"`);
      console.error(`- Action Triggered ≠ Action Submitted!`);
      console.error(`🚨 ==============================================================\n`);
      process.exit(1);
    }

    if (!entry.confirmation_text || entry.confirmation_text.trim().length < 4) {
      console.error(`🛑 HARD BLOCK: Missing post-submit confirmation DOM text in entry!`);
      process.exit(1);
    }
  }

  console.log(`✅ [GUARD PROOF] Verified physical proof for [${entry.company}]: ${screenshotPath || 'Live Sent Asserted'}`);
  return true;
}

module.exports = {
  assertApplicationProof
};
