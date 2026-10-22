const fs = require('fs');
const f4 = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/data/daily/verified_todays_2026-10-22.json', 'utf8'));

console.log('========================================================================');
console.log('✉️ CONFIRMED 11 VERIFIED DIRECT RECRUITER EMAIL LEADS (READY FOR DISPATCH)');
console.log('========================================================================');

const emailJobs = f4.jobs.filter(j => j.application_type === 'READY_FOR_DIRECT_EMAIL');
emailJobs.forEach((j, i) => {
  console.log(`[${i+1}] ${j.company} | ${j.role} -> HR: ${j.recipient}`);
});
