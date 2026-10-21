import fs from 'fs';
import puppeteer from 'puppeteer-core';

async function auditDates() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222' });
  const verified = JSON.parse(fs.readFileSync('scripts/slot4_deep_verified_portals.json', 'utf8') || '[]');

  console.log(`Auditing posted dates for ${verified.length} verified jobs...`);
  const freshList = [];
  const staleList = [];

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  for (let i = 0; i < verified.length; i++) {
    const job = verified[i];
    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await new Promise(r => setTimeout(r, 1500));

      const dateInfo = await page.evaluate(() => {
        const text = document.body.innerText;
        
        // Match relative dates like "Posted 2 days ago", "1 day ago", "3 hours ago", "Posted today", "2 weeks ago", "1 month ago"
        const relMatch = text.match(/posted\s+([0-9]+\s+(?:hours?|days?|weeks?|months?)\s+ago)/i) ||
                         text.match(/([0-9]+\s+(?:hours?|days?|weeks?|months?)\s+ago)/i) ||
                         text.match(/(today|yesterday|just now)/i);

        return relMatch ? relMatch[0] : 'Unknown Date';
      });

      const isStale = dateInfo.includes('month') || 
                      dateInfo.includes('3 weeks ago') || 
                      dateInfo.includes('4 weeks ago') || 
                      dateInfo.includes('30+ days ago');

      if (isStale) {
        console.log(`[${i+1}/${verified.length}] ❌ STALE: ${job.company} (${dateInfo})`);
        staleList.push({ ...job, postedDate: dateInfo });
      } else {
        console.log(`[${i+1}/${verified.length}] 🟢 FRESH: ${job.company} (${dateInfo})`);
        freshList.push({ ...job, postedDate: dateInfo });
      }
    } catch (e) {
      console.log(`[${i+1}/${verified.length}] ⚠️ Error: ${job.company} (${e.message})`);
    }
  }

  await page.close();

  fs.writeFileSync('scripts/slot4_fresh_verified_portals.json', JSON.stringify(freshList, null, 2));
  fs.writeFileSync('scripts/slot4_stale_rejected_portals.json', JSON.stringify(staleList, null, 2));

  console.log(`\nDONE! Fresh: ${freshList.length} | Stale (Old): ${staleList.length}`);
  process.exit(0);
}

auditDates().catch(e => {
  console.error(e);
  process.exit(1);
});
