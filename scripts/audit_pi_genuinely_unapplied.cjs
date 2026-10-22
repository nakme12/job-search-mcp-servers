const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  const harvest = JSON.parse(fs.readFileSync('C:/mcp/placementindia_harvested_jobs.json', 'utf8'));
  console.log(`Auditing ${harvest.length} jobs for true unapplied status...`);

  const genuinelyUnapplied = [];

  for (let i = 0; i < harvest.length; i++) {
    const job = harvest[i];
    try {
      await page.goto(job.jobUrl, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await sleep(1000);

      const status = await page.evaluate(() => {
        const text = document.body.innerText;
        const isApplied = /applied on \d{2}\/\d{2}\/\d{4}|already applied/i.test(text);
        const applyBtn = Array.from(document.querySelectorAll('a, button')).find(b => (b.innerText || '').trim().toLowerCase() === 'apply');
        return { isApplied, hasApplyBtn: !!applyBtn };
      });

      if (!status.isApplied && status.hasApplyBtn) {
        console.log(`✅ [GENUINE UNAPPLIED #${genuinelyUnapplied.length + 1}]: ${job.company} — ${job.title}`);
        console.log(`   URL: ${job.jobUrl}`);
        genuinelyUnapplied.push(job);
      } else {
        // Already applied
      }
    } catch (e) {
      console.log(`⚠️ Error on ${job.company}: ${e.message}`);
    }

    if (genuinelyUnapplied.length >= 30) {
      console.log('Found 30 genuine unapplied jobs! Stopping scan.');
      break;
    }
  }

  console.log(`\nScan finished. Found ${genuinelyUnapplied.length} genuinely unapplied jobs.`);
  fs.writeFileSync('C:/mcp/placementindia_genuinely_unapplied.json', JSON.stringify(genuinelyUnapplied, null, 2), 'utf8');

  await page.close();
  await browser.disconnect();
})();
