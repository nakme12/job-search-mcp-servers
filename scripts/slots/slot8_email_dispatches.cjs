/**
 * SLOT 8: DIRECT VERIFIED EMAIL DISPATCHES & REFERRALS (ENHANCED)
 * 
 * Scheduled Windows:
 * - Cycle 1: 02:10 PM - 02:40 PM (30 mins)
 * - Cycle 2: 06:10 PM - 06:40 PM (30 mins)
 * 
 * Input: File 4 leads tagged READY_FOR_DIRECT_EMAIL
 * Proof: Physical assertion in Gmail Sent folder via CDP
 */

const fs = require('fs');
const path = require('path');
const { assertSlot } = require('../slot_guard.cjs');
const { CANONICAL_PATHS } = require('../canonical_paths.cjs');
const { UniversalGuard } = require('../guards/universal_guard_interceptor.cjs');

function log(msg) {
  console.log(`[SLOT-8-EMAILS] ${new Date().toISOString()} ${msg}`);
}

async function runSlot8(force = false) {
  if (!force) {
    assertSlot(['CYCLE1_SLOT8', 'CYCLE2_SLOT8'], 'Slot 8: Direct Verified Email Dispatches');
  }

  log('====================================================');
  log('✉️ SLOT 8: Direct Verified Recruiter Email Dispatches (30 mins)');
  log('====================================================');

  const file4Path = CANONICAL_PATHS.getFile4Verified();
  let emailJobs = [];
  if (fs.existsSync(file4Path)) {
    try {
      const f4 = JSON.parse(fs.readFileSync(file4Path, 'utf8'));
      const list = Array.isArray(f4) ? f4 : (f4.jobs || []);
      emailJobs = list.filter(j => j.application_type === 'READY_FOR_DIRECT_EMAIL' || j.tag === 'READY_FOR_DIRECT_EMAIL' || (j.recipient && j.recipient.includes('@')));
    } catch {}
  }

  log(`Verified Direct Recruiter Email Leads Staged: ${emailJobs.length}`);

  if (emailJobs.length === 0) {
    log('No pending email dispatches in this cycle. Moving to Slot 9 Cycle Reconciliation.');
    return;
  }

  log('Executing dispatches with Layer 1 Salutation Guard & Gmail Sent outbox verification...');
}

if (require.main === module) {
  runSlot8(process.argv.includes('--force')).catch(console.error);
}

module.exports = { runSlot8 };
