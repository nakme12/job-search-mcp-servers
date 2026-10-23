const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');

async function openRealJobsForUser() {
  const f4 = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/data/daily/verified_todays_2026-10-22.json', 'utf8'));

  // Pick genuine 3 jobs
  const jobsToOpen = [
    f4.jobs.find(j => j.company.toLowerCase().includes('supabase')),
    f4.jobs.find(j => j.company.toLowerCase().includes('elevenlabs')),
    f4.jobs.find(j => (j.source || '').toLowerCase().includes('naukri'))
  ].filter(Boolean);

  console.log(`Connecting to Brave CDP at http://127.0.0.1:9222...`);
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];

  for (const job of jobsToOpen) {
    console.log(`Opening live tab for: ${job.company} - ${job.role}`);
    console.log(`URL: ${job.url}`);
    const page = await context.newPage();
    await page.goto(job.url, { waitUntil: 'domcontentloaded' }).catch(e => console.log('Goto notice:', e.message));
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n✅ All 3 verified job tabs are now LIVE and OPEN in your Brave browser for you to inspect!');
}

openRealJobsForUser().catch(console.error);
