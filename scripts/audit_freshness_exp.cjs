const fs = require('fs');
const f4 = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/data/daily/verified_todays_2026-10-22.json', 'utf8'));

console.log('--- STRICT 7-DAY FRESHNESS & 0-2 YOE EXP CHECK ON ALL 65 JOBS ---');
const now = new Date('2026-10-22T19:03:00Z');
let staleCount = 0;
let outOfRangeExp = 0;

f4.jobs.forEach((j, i) => {
  // Check Exp
  const role = (j.role || '').toLowerCase();
  const desc = (j.description || '').toLowerCase();
  if (role.includes('senior') || role.includes('lead') || role.includes('principal') || role.includes('architect') || desc.includes('3+ years') || desc.includes('4+ years')) {
    outOfRangeExp++;
    console.log(`[EXP-FAIL] [${i+1}] ${j.company} - ${j.role}`);
  }

  // Check Freshness
  let d = j.date_posted;
  if (typeof d === 'number') d = d * 1000;
  const postDate = new Date(d);
  if (!isNaN(postDate)) {
    const diffDays = (now - postDate) / (1000 * 60 * 60 * 24);
    if (diffDays > 7) {
      staleCount++;
      console.log(`[STALE-FAIL] [${i+1}] ${j.company} posted ${diffDays.toFixed(1)} days ago`);
    }
  }
});

console.log('\nAudit Results:');
console.log(`  • Out-of-Range (3+ YOE / Senior): ${outOfRangeExp}`);
console.log(`  • Stale Jobs (>7 days old): ${staleCount}`);
console.log(`  • 100% Fresh (<= 7 days) & 0-2 YOE: ${f4.jobs.length - staleCount - outOfRangeExp}/${f4.jobs.length}`);
