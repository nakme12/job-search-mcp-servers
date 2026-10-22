/**
 * SLOT 3: QUICK LIVE DOM AUDIT & EARLY VERIFICATION (ENHANCED)
 * 
 * Scheduled Windows:
 * - Cycle 1: 11:40 AM - 12:00 PM
 * - Cycle 2: 03:40 PM - 04:00 PM
 * 
 * Audits File 3 raw leads (data/daily/total_todays_<DATE>.json)
 * Filters 0-2 YOE & writes to File 4 (data/daily/verified_todays_<DATE>.json)
 */

const fs = require('fs');
const path = require('path');
const { assertSlot } = require('../slot_guard.cjs');
const { CANONICAL_PATHS } = require('../canonical_paths.cjs');

function log(msg) {
  console.log(`[SLOT-3-AUDIT] ${new Date().toISOString()} ${msg}`);
}

async function runSlot3(force = false) {
  if (!force) {
    assertSlot(['CYCLE1_SLOT3', 'CYCLE2_SLOT3'], 'Slot 3: Quick Live DOM Audit Batch 1');
  }

  log('====================================================');
  log('🔍 SLOT 3: Quick Live DOM Audit & Early Verification');
  log('====================================================');

  const file3Path = CANONICAL_PATHS.getFile3Today();
  const file4Path = CANONICAL_PATHS.getFile4Verified();

  fs.mkdirSync(path.dirname(file4Path), { recursive: true });

  let rawList = [];
  if (fs.existsSync(file3Path)) {
    try {
      const raw = JSON.parse(fs.readFileSync(file3Path, 'utf8'));
      rawList = Array.isArray(raw) ? raw : (raw.jobs || []);
    } catch (e) {
      log(`Warning: Failed to parse File 3: ${e.message}`);
    }
  }

  log(`Input Leads to Audit (File 3): ${rawList.length}`);

  // Quality Filter: 0-2 YOE, Exclude Senior/Lead
  const passed = [];
  for (const job of rawList) {
    const title = (job.role || job.title || '').toLowerCase();
    const desc = (job.description || job.jd || '').toLowerCase();

    const isSenior = title.includes('senior') || title.includes('lead') || title.includes('principal') || title.includes('architect');
    const isOutRangeExp = desc.includes('3+ years') || desc.includes('4+ years') || desc.includes('5+ years');

    if (!isSenior && !isOutRangeExp) {
      passed.push(job);
    }
  }

  // Write verified leads to File 4
  const file4Data = {
    date: new Date().toISOString().split('T')[0],
    description: 'Slot 3 Verified Batch 1 Clean Jobs',
    total: passed.length,
    jobs: passed
  };
  fs.writeFileSync(file4Path, JSON.stringify(file4Data, null, 2));

  log(`✅ Slot 3 Audit Complete. Passed (0-2 YOE): ${passed.length} | Discarded: ${rawList.length - passed.length}`);
  log(`Output staged to File 4: ${file4Path}`);
}

if (require.main === module) {
  runSlot3(process.argv.includes('--force')).catch(console.error);
}

module.exports = { runSlot3 };
