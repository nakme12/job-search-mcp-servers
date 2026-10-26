const fs = require('fs');
const path = require('path');

const ENGINE_ROOT = path.resolve(__dirname, '..');
const TODAY_DATE = '2026-10-25';

console.log('=================================================================');
console.log('🔍 DEEP RIGOROUS SYSTEM AUDIT & INTEGRITY VERIFICATION');
console.log('=================================================================');

let totalErrors = 0;
let totalWarnings = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    totalErrors++;
  }
}

function warn(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
  } else {
    console.warn(`  ⚠️ WARN: ${message}`);
    totalWarnings++;
  }
}

// 1. Resumes on Disk Assertion
console.log('\n--- 1. Authorized Resumes Physical Assertion ---');
const resumes = [
  'Pratik Patidar Resume - Frontend Engineer.pdf',
  'Pratik Patidar Resume - React Developer.pdf',
  'Pratik Patidar Resume - MERN Full Stack.pdf'
];
resumes.forEach(r => {
  const p = path.join(ENGINE_ROOT, 'resumes', r);
  assert(fs.existsSync(p), `Resume file exists: ${r} (${fs.existsSync(p) ? fs.statSync(p).size : 0} bytes)`);
});

// 2. Applied Today (File 5) Integrity
console.log('\n--- 2. Applied Today Integrity Check (applied_todays_2026-10-25.json) ---');
const appliedPath = path.join(ENGINE_ROOT, `applied_todays_${TODAY_DATE}.json`);
assert(fs.existsSync(appliedPath), `applied_todays_${TODAY_DATE}.json exists`);

let appliedData = [];
if (fs.existsSync(appliedPath)) {
  try {
    appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    assert(Array.isArray(appliedData), `File is a valid JSON Array (Length: ${appliedData.length})`);
    
    // Check each record
    appliedData.forEach((rec, idx) => {
      const id = idx + 1;
      assert(!!rec.company, `[#${id}] Has company name: "${rec.company}"`);
      assert(!!(rec.recipient || rec.url), `[#${id}] Has target (recipient/url): "${rec.recipient || rec.url}"`);
      assert(!!rec.resume, `[#${id}] Has mapped resume: "${rec.resume}"`);
      
      const resumeExists = fs.existsSync(path.join(ENGINE_ROOT, 'resumes', rec.resume));
      assert(resumeExists, `[#${id}] Resume exists on disk for "${rec.company}"`);
      
      if (rec.screenshot) {
        assert(fs.existsSync(rec.screenshot), `[#${id}] Screenshot file exists on disk: ${path.basename(rec.screenshot)}`);
      }
      if (rec.sent_folder_proof) {
        assert(rec.sent_folder_proof.length > 5, `[#${id}] Sent folder proof asserted: "${rec.sent_folder_proof}"`);
      }
    });
  } catch (e) {
    assert(false, `Error parsing applied_todays: ${e.message}`);
  }
}

// 3. Verified Today (File 4) Integrity
console.log('\n--- 3. Verified Targets Integrity Check (verified_todays_2026-10-25.json) ---');
const verifiedPath = path.join(ENGINE_ROOT, `verified_todays_${TODAY_DATE}.json`);
assert(fs.existsSync(verifiedPath), `verified_todays_${TODAY_DATE}.json exists`);

if (fs.existsSync(verifiedPath)) {
  try {
    const verified = JSON.parse(fs.readFileSync(verifiedPath, 'utf8'));
    assert(Array.isArray(verified.jobs), `File 4 contains jobs array (Length: ${verified.jobs ? verified.jobs.length : 0})`);
    assert(verified.total === verified.jobs.length, `File 4 total count matches array length (${verified.total} === ${verified.jobs.length})`);
    
    verified.jobs.forEach((j, i) => {
      assert(!!j.url, `[Verified #${i + 1}] Has valid URL: ${j.company} -> ${j.url}`);
      assert(j.status === 'VERIFIED_AUDITED', `[Verified #${i + 1}] Has VERIFIED_AUDITED status`);
    });
  } catch (e) {
    assert(false, `Error parsing verified_todays: ${e.message}`);
  }
}

// 4. Historical File 1 Deduplication Integrity
console.log('\n--- 4. Lifetime Historical Deduplication Check (total_historical_except_today.json) ---');
const histPath = path.join(ENGINE_ROOT, 'total_historical_except_today.json');
assert(fs.existsSync(histPath), `total_historical_except_today.json exists`);

if (fs.existsSync(histPath)) {
  try {
    const hist = JSON.parse(fs.readFileSync(histPath, 'utf8'));
    const jobs = hist.jobs || hist;
    assert(Array.isArray(jobs), `Historical file contains valid array (Length: ${jobs.length})`);
    
    // Check for internal duplicates in historical
    const seen = new Set();
    let dups = 0;
    jobs.forEach(j => {
      const key = (j.recipient_or_url || j.url || j.recipient || '').toLowerCase().trim();
      if (key) {
        if (seen.has(key)) dups++;
        seen.add(key);
      }
    });
    warn(dups === 0, `Historical internal duplicates: ${dups} duplicate entries (Unique: ${seen.size})`);
  } catch (e) {
    assert(false, `Error parsing historical file: ${e.message}`);
  }
}

// 5. Screenshots Vault Integrity
console.log('\n--- 5. Screenshot Vault Physical File Assertions ---');
const ssDir = path.join(ENGINE_ROOT, 'screenshots', TODAY_DATE, 'slot6');
if (fs.existsSync(ssDir)) {
  const files = fs.readdirSync(ssDir);
  console.log(`Found ${files.length} screenshot files in ${ssDir}:`);
  files.forEach(f => {
    const sz = fs.statSync(path.join(ssDir, f)).size;
    assert(sz > 1000, `Screenshot valid and non-empty: ${f} (${(sz / 1024).toFixed(1)} KB)`);
  });
} else {
  assert(false, `Screenshots directory does not exist: ${ssDir}`);
}

console.log('\n=================================================================');
console.log(`🏁 AUDIT RESULT: ${totalErrors} ERRORS, ${totalWarnings} WARNINGS`);
console.log('=================================================================');
