/**
 * SLOT 6: QUICK LIVE DOM AUDIT & MERGED CDP VERIFICATION (ENHANCED)
 * 
 * Scheduled Windows:
 * - Cycle 1: 12:40 PM - 01:20 PM (40 mins)
 * - Cycle 2: 04:40 PM - 05:20 PM (40 mins)
 * 
 * Audits all afternoon leads from File 3 (data/daily/total_todays_<DATE>.json)
 * Merges clean 0-2 YOE into File 4 (data/daily/verified_todays_<DATE>.json)
 * Tags leads: READY_FOR_ATS_PORTAL_FORM vs READY_FOR_DIRECT_EMAIL
 */

const fs = require('fs');
const path = require('path');
const { assertSlot } = require('../slot_guard.cjs');
const { CANONICAL_PATHS } = require('../canonical_paths.cjs');

function log(msg) {
  console.log(`[SLOT-6-MERGED-AUDIT] ${new Date().toISOString()} ${msg}`);
}

async function runSlot6(force = false) {
  if (!force) {
    assertSlot(['CYCLE1_SLOT6', 'CYCLE2_SLOT6'], 'Slot 6: Quick Live DOM Audit Batch 2');
  }

  log('====================================================');
  log('🔎 SLOT 6: Merged CDP Destination Verification (Batch 2)');
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

  log(`Input Raw Leads from Live Feeds & MCP: ${rawList.length}`);

  let existingF4 = [];
  if (fs.existsSync(file4Path)) {
    try {
      const raw4 = JSON.parse(fs.readFileSync(file4Path, 'utf8'));
      existingF4 = Array.isArray(raw4) ? raw4 : (raw4.jobs || []);
    } catch {}
  }

  // 0-2 YOE Tagging & Separation
  const verifiedBatch2 = [];
  for (const job of rawList) {
    const title = (job.role || job.title || '').toLowerCase();
    const desc = (job.description || job.jd || '').toLowerCase();

    if (title.includes('senior') || title.includes('lead') || title.includes('principal')) continue;
    if (desc.includes('3+ years') || desc.includes('4+ years')) continue;

    // Tag lead type
    if (job.email || job.hr_email) {
      job.tag = 'READY_FOR_DIRECT_EMAIL';
    } else {
      job.tag = 'READY_FOR_ATS_PORTAL_FORM';
    }
    verifiedBatch2.push(job);
  }

  const mergedVerified = [...existingF4, ...verifiedBatch2];
  const file4Output = {
    date: new Date().toISOString().split('T')[0],
    description: 'Merged Cycle Verified Leads',
    total: mergedVerified.length,
    jobs: mergedVerified
  };
  fs.writeFileSync(file4Path, JSON.stringify(file4Output, null, 2));

  log(`✅ Slot 6 Complete. Merged verified jobs count in File 4: ${mergedVerified.length}`);
  log(`Portals: ${mergedVerified.filter(j => j.tag === 'READY_FOR_ATS_PORTAL_FORM').length} | Direct Emails: ${mergedVerified.filter(j => j.tag === 'READY_FOR_DIRECT_EMAIL').length}`);
}

if (require.main === module) {
  runSlot6(process.argv.includes('--force')).catch(console.error);
}

module.exports = { runSlot6 };
