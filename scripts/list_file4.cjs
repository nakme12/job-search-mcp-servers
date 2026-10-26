const fs = require('fs');
const d = JSON.parse(fs.readFileSync('verified_todays_2026-10-25.json'));
console.log('=== VERIFIED TARGETS READY FOR SLOT 6 PORTAL APPLICATION ===');
console.log(`Total: ${d.jobs.length}\n`);
d.jobs.forEach((j, i) => {
  console.log(`${i+1}. [${j.company}] ${j.role}`);
  console.log(`   Location: ${j.location}`);
  console.log(`   URL: ${j.url}`);
  console.log(`   Resume: ${j.resume_mapped}\n`);
});
