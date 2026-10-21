const fs = require('fs');
const puppeteer = require('puppeteer-core');

async function main() {
  const verifiedData = JSON.parse(fs.readFileSync('verified_todays_2026-10-19.json', 'utf8'));
  const appliedData = JSON.parse(fs.readFileSync('applied_todays_2026-10-19.json', 'utf8'));
  const totalData = JSON.parse(fs.readFileSync('total_todays_2026-10-19.json', 'utf8'));

  const pendingPortals = verifiedData.jobs.filter(j => !j.email && !j.target_email);

  console.log(`=== TOTAL VERIFIED JOBS: ${verifiedData.jobs.length} ===`);
  console.log(`- Confirmed Applied (Emails): ${appliedData.jobs.length}`);
  console.log(`- Pending Portals: ${pendingPortals.length}`);
  console.log(`=== TOTAL RAW LEADS TODAY: ${totalData.jobs.length} ===\n`);

  console.log('--- ALL PENDING PORTALS IN VERIFIED LIST ---');
  pendingPortals.forEach((j, i) => {
    const url = j.url || j.apply_url || 'NO_URL';
    const role = j.role || j.title || 'Unknown Role';
    const comp = j.company || 'Unknown Company';
    const exp = j.experience || j.exp || 'N/A';
    const loc = j.location || 'N/A';
    console.log(`${i+1}. [${j.source || 'portal'}] ${comp} — ${role} (${exp}) [${loc}]\n   URL: ${url}`);
  });

  // Check what jobs in totalData were discarded / not in verified
  const verifiedUrls = new Set(verifiedData.jobs.map(j => (j.url || j.apply_url || j.email || '').toLowerCase().trim()));
  const unverifiedJobs = totalData.jobs.filter(j => {
    const u = (j.url || j.apply_url || j.email || '').toLowerCase().trim();
    return !verifiedUrls.has(u);
  });

  console.log(`\n--- DISCARDED / UNVERIFIED JOBS FROM RAW POOL: ${unverifiedJobs.length} ---`);
  unverifiedJobs.forEach((j, i) => {
    const url = j.url || j.apply_url || 'NO_URL';
    const role = j.role || j.title || 'Unknown Role';
    const comp = j.company || 'Unknown Company';
    const exp = j.experience || j.exp || 'N/A';
    console.log(`${i+1}. ${comp} — ${role} (${exp}) | ${url}`);
  });
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
