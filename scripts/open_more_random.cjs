const playwright = require('C:/mcp/naukri-auto-apply-engine/node_modules/playwright');
const fs = require('fs');

async function openDiverseJobs() {
  const f4 = JSON.parse(fs.readFileSync('C:/mcp/job-search-mcp-engine/data/daily/verified_todays_2026-10-22.json', 'utf8'));

  // Diverse 3 jobs: Rippling ATS (Alaan) + Rentomojo (Frontend) + Unico Connect (React)
  const jobsToOpen = [
    f4.jobs.find(j => j.company.includes('Alaan')),
    f4.jobs.find(j => j.company.includes('Rentomojo')),
    f4.jobs.find(j => j.company.includes('Unico Connect'))
  ].filter(Boolean);

  console.log('Connecting to Brave CDP at http://127.0.0.1:9222...');
  const browser = await playwright.chromium.connectOverCDP('http://127.0.0.1:9222');
  const context = browser.contexts()[0];

  for (const job of jobsToOpen) {
    console.log(`Opening live tab: ${job.company} - ${job.role}`);
    console.log(`URL: ${job.url}`);
    const page = await context.newPage();
    await page.goto(job.url, { waitUntil: 'domcontentloaded' }).catch(e => console.log('Notice:', e.message));
    await new Promise(r => setTimeout(r, 2000));
  }

  console.log('\n✅ 3 NEW diverse random jobs are now OPEN in your Brave browser for live inspection!');
}

openDiverseJobs().catch(console.error);
