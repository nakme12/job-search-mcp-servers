const fs = require('fs');

const u = JSON.parse(fs.readFileSync('C:\\mcp\\pending_unapplied_verified.json', 'utf8'));
const adzuna = u.filter(j => j.source === 'Adzuna India' || (j.platform || '').includes('Adzuna'));
console.log('Total Adzuna jobs pending:', adzuna.length);
adzuna.forEach((j, i) => {
  console.log(`[#${i+1}] ${j.company} | ${j.role} | URL: ${(j.url || j.apply_url || '').substring(0, 70)}`);
});
