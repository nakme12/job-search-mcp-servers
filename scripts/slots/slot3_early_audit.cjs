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

  // Hardened REA Quality Filter (0-2 YOE, Strict Stack, Exclude Senior/Lead)
  const { evaluateExperience } = require('../../servers/experience-filter.js');
  const passed = [];
  const discarded = [];

  for (const job of rawList) {
    const title = job.role || job.title || '';
    const description = job.description || job.jd || '';

    // Check with universal REA experience filter
    const ev = evaluateExperience({ title, description }, 2, true);
    if (!ev.exclude && ev.passes_whitelist && !ev.is_non_stack) {
      passed.push(job);
    } else {
      discarded.push({ company: job.company, role: title, reason: ev });
    }
  }

  // Preserve existing File 4 verified leads without blind overwrite
  let finalFile4Jobs = passed;
  if (fs.existsSync(file4Path)) {
    try {
      const existingF4 = JSON.parse(fs.readFileSync(file4Path, 'utf8'));
      const existingList = Array.isArray(existingF4) ? existingF4 : (existingF4.jobs || []);
      const seenUrls = new Set(passed.map(j => (j.url || '').toLowerCase()));
      for (const ej of existingList) {
        if (!seenUrls.has((ej.url || '').toLowerCase())) {
          seenUrls.add((ej.url || '').toLowerCase());
          finalFile4Jobs.push(ej);
        }
      }
    } catch (e) {}
  }

  // Write verified leads to File 4
  const file4Data = {
    date: new Date().toISOString().split('T')[0],
    description: 'Slot 3 Verified Batch 1 Clean Jobs',
    total: finalFile4Jobs.length,
    jobs: finalFile4Jobs
  };
  fs.writeFileSync(file4Path, JSON.stringify(file4Data, null, 2));

  log(`✅ Slot 3 Audit Complete. Passed (0-2 YOE): ${passed.length} | Discarded: ${discarded.length}`);
  log(`Total Cumulative Verified Staged in File 4: ${finalFile4Jobs.length}`);
  log(`Output staged to File 4: ${file4Path}`);
}

if (require.main === module) {
  runSlot3(process.argv.includes('--force')).catch(console.error);
}

module.exports = { runSlot3 };
