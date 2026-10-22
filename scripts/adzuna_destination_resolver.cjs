const fs = require('fs');
const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    const unapplied = JSON.parse(fs.readFileSync('C:\\mcp\\pending_unapplied_verified.json', 'utf8'));
    const adzunaJobs = unapplied.filter(j => j.source === 'Adzuna India' || (j.platform || '').includes('Adzuna'));
    console.log(`Resolving destination URLs for ${adzunaJobs.length} Adzuna jobs...`);

    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();

    const resolved = [];

    // Pre-resolve first 10 to see platform breakdown
    for (let i = 0; i < Math.min(adzunaJobs.length, 12); i++) {
      const job = adzunaJobs[i];
      try {
        await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
        await new Promise(r => setTimeout(r, 1200));

        const destLink = await page.evaluate(() => {
          const btn = document.querySelector('a.apply-button, a[data-testid="apply-button"], a[href*="/land/ad/"]');
          return btn ? btn.href : null;
        });

        if (destLink) {
          await page.goto(destLink, { waitUntil: 'domcontentloaded', timeout: 15000 });
          await new Promise(r => setTimeout(r, 2000));
          const finalUrl = page.url();
          const host = new URL(finalUrl).hostname.replace('www.', '');
          console.log(`[Job ${i + 1}] ${job.company} -> ${host} (${job.role})`);
          resolved.push({
            company: job.company,
            role: job.role,
            adzunaUrl: job.url,
            finalUrl: finalUrl,
            host: host
          });
        }
      } catch (err) {
        console.log(`[Job ${i + 1}] ${job.company} -> Failed: ${err.message}`);
      }
    }

    await page.close();
    fs.writeFileSync('C:\\mcp\\adzuna_resolved_sample.json', JSON.stringify(resolved, null, 2), 'utf8');
    console.log(`\nSample resolved: ${resolved.length} jobs.`);
  } catch(e) {
    console.error('Error:', e.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
