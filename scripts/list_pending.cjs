const fs = require('fs');

const unapplied = JSON.parse(fs.readFileSync('C:\\mcp\\pending_unapplied_verified.json', 'utf8'));
const tgAndNaukri = unapplied.filter(j => (j.platform || '').includes('Telegram') || (j.platform || '').includes('Naukri'));
console.log('TG & Naukri jobs count:', tgAndNaukri.length);
tgAndNaukri.forEach((j, i) => {
  console.log(`[#${i+1}] ${j.company} | ${j.role} | ${j.platform} | ${j.url || j.apply_url}`);
});
