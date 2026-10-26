const fs = require('fs');
const UniversalGuardInterceptor = require('../scripts/guards/universal_guard_interceptor.cjs');

const file3Path = 'total_todays_2026-10-26.json';
const file3 = JSON.parse(fs.readFileSync(file3Path, 'utf8'));

console.log(`Initial leads in File 3: ${file3.jobs.length}`);

const purgedJobs = [];
const keptJobs = [];

for (const job of file3.jobs) {
  const title = job.title || job.role || '';
  const text = `${title} ${job.company} ${job.raw_text || ''} ${job.experience || ''}`;
  
  // 1. Title Seniority check
  const titleSenior = /\b(senior|lead|principal|architect|staff|director|head\s+of|manager)\b/i.test(title);
  if (titleSenior) {
    purgedJobs.push({ company: job.company, title, reason: 'SENIOR_TITLE' });
    continue;
  }

  // 2. Non-stack check (Java, DevOps, Python, etc.)
  const isBanned = /\b(java developer|python developer|devops|data engineer|hardware|flutter|react native|brand designer)\b/i.test(title);
  if (isBanned) {
    purgedJobs.push({ company: job.company, title, reason: 'BANNED_STACK' });
    continue;
  }

  // 3. Strict out of range check: en-dash, em-dash, ASCII hyphen, standalone 5+, 4+, 3+
  const expStr = (job.experience || '') + ' ' + (job.raw_text || '');
  const hasHighExp = /\b([3-9]|1[0-9])\s*(\+|\-|–|—|to)\s*([0-9]+)?\s*(years?|yrs?)?/i.test(expStr);
  const isBroadAllowed = /\b[0-2]\s*(\-|–|—|to)\s*[3-5]\s*(years?|yrs?)?/i.test(expStr) || /\b(fresher|0-1|0-2|1-2|1-3|2-3|2-4)\b/i.test(expStr);

  if (hasHighExp && !isBroadAllowed) {
    purgedJobs.push({ company: job.company, title, reason: `OUT_OF_RANGE_YOE (${job.experience})` });
    continue;
  }

  keptJobs.push(job);
}

file3.jobs = keptJobs;
file3.total = keptJobs.length;
file3.updated_at = new Date().toISOString();
fs.writeFileSync(file3Path, JSON.stringify(file3, null, 2), 'utf8');

console.log(`\nPurged ${purgedJobs.length} invalid/senior/high-YOE leads:`);
purgedJobs.forEach(p => console.log(`  ❌ ${p.company} - ${p.title} (${p.reason})`));
console.log(`\n✅ Clean Verified Pool remaining in File 3: ${file3.total} leads.`);
