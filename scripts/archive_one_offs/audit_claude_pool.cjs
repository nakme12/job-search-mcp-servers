const fs = require('fs');

function loadKeys(filePath) {
  const keys = new Set();
  if (!fs.existsSync(filePath)) return keys;
  try {
    const d = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const list = Array.isArray(d) ? d : (d.jobs || d.applications || []);
    list.forEach(j => {
      const u = (j.url || j.recipient_or_url || j.link || '').toLowerCase().trim();
      const c = (j.company || '').toLowerCase().trim();
      if (u) keys.add(u);
      if (c) keys.add(c);
      const m = u.match(/(\d{8,})/);
      if (m) keys.add(m[1]);
    });
  } catch(e) {}
  return keys;
}

const allApplied = new Set([
  ...loadKeys('applied_lifetime_except_today.json'),
  ...loadKeys('applied_todays_2026-10-14_shift1.json'),
  ...loadKeys('applied_todays_2026-10-14_shift2.json'),
  ...loadKeys('applied_todays_2026-10-14.json')
]);

const allVerified = new Set([
  ...loadKeys('verified_todays_2026-10-14_shift1.json'),
  ...loadKeys('verified_todays_2026-10-14_shift2.json'),
  ...loadKeys('verified_todays_2026-10-14.json')
]);

const rawPool = JSON.parse(fs.readFileSync('claude_extracted_unverified_pool.json', 'utf8'));

let appliedCount = 0;
let verifiedCount = 0;
let skippedCount = 0;
const cleanQueue = [];

rawPool.forEach(j => {
  const cKey = j.company.toLowerCase();
  const uKey = j.url.toLowerCase();
  const m = uKey.match(/(\d{8,})/);
  const jId = m ? m[1] : null;

  if (allApplied.has(cKey) || allApplied.has(uKey) || (jId && allApplied.has(jId))) {
    appliedCount++;
    return;
  }
  if (allVerified.has(cKey) || allVerified.has(uKey) || (jId && allVerified.has(jId))) {
    verifiedCount++;
    return;
  }

  // Pre-filter on Notes and Role (0-2 YOE check)
  const notes = (j.notes || '').toLowerCase();
  const role = (j.role || '').toLowerCase();

  const isSenior = role.includes('senior') || role.includes('lead') || role.includes('architect') || role.includes('manager');
  const isBannedStack = role.includes('react native') || role.includes('android') || role.includes('ios') || role.includes('devops');
  const isHighYoe = notes.includes('3+') || notes.includes('4+') || notes.includes('5+') || notes.includes('3-5') || notes.includes('4-6') || notes.includes('3-6');

  if (isSenior || isBannedStack || isHighYoe) {
    skippedCount++;
    return;
  }

  cleanQueue.push(j);
});

console.log('=== AUDIT RESULTS FOR CLAUDE CSV POOL ===');
console.log('Total Raw Jobs in Claude CSV:', rawPool.length);
console.log('Already Confirmed Applied (Blacklisted):', appliedCount);
console.log('Already in Today Verified Queue:', verifiedCount);
console.log('Pruned/Skipped (Senior / Banned Stack / 3+ YOE in Notes):', skippedCount);
console.log('CLEAN VERIFIED / READY QUEUE:', cleanQueue.length);

fs.writeFileSync('claude_ready_to_apply_queue.json', JSON.stringify(cleanQueue, null, 2));
console.log('Saved clean queue to claude_ready_to_apply_queue.json');

console.log('\nTop 10 High-Priority Candidates from Clean Queue:');
cleanQueue.slice(0, 10).forEach((j, idx) => {
  console.log(`${idx + 1}. [${j.company}] ${j.role} (${j.location}) -> ${j.url}`);
});
