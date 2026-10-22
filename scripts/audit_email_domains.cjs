const fs = require('fs');
const f4 = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/data/daily/verified_todays_2026-10-22.json', 'utf8'));

console.log('--- RECRUITER EMAIL DOMAIN AUDIT ---');
const emails = f4.jobs.filter(j => j.application_type === 'READY_FOR_DIRECT_EMAIL');
emails.forEach((j, i) => {
  const isCorporate = !j.recipient.endsWith('@gmail.com') && !j.recipient.endsWith('@yahoo.com') && !j.recipient.endsWith('@outlook.com');
  console.log(`[${i+1}] ${j.company} | ${j.role} -> ${j.recipient} [Corporate: ${isCorporate ? 'YES' : 'NO'}]`);
});
