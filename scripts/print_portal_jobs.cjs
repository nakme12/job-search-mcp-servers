const fs = require('fs');
const f4 = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/data/daily/verified_todays_2026-10-22.json', 'utf8'));

console.log('--- ALL READY_FOR_ATS_PORTAL_FORM JOBS IN FILE 4 ---');
const portals = f4.jobs.filter(j => j.application_type === 'READY_FOR_ATS_PORTAL_FORM' || !j.application_type);
console.log('Total Portal Jobs:', portals.length);
portals.forEach((j, i) => {
  console.log(`[${i+1}] ${j.company} | ${j.role} -> ${j.url}`);
});
