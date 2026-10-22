const fs = require('fs');
const canonicalToday = 'C:/mcp/job-search-mcp-engine/data/daily/total_todays_2026-10-22.json';
const data = JSON.parse(fs.readFileSync(canonicalToday, 'utf8'));

console.log('========================================================================');
console.log(`🎯 SLOT 2 HARVESTED & REA-FILTERED LEADS (TOTAL: ${data.jobs.length})`);
console.log('========================================================================');

data.jobs.forEach((j, idx) => {
  console.log(`[${idx + 1}] ${j.company} | ${j.role} | 📍 ${j.location} [${j.source}]`);
});
