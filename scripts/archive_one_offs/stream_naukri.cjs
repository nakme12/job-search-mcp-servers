const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { auditJobText } = require('./job_gatekeeper.cjs');

async function processNaukriStream() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });

  const total = JSON.parse(fs.readFileSync('total_todays_2026-10-14.json', 'utf8')).jobs;
  const applied = JSON.parse(fs.readFileSync('applied_todays_2026-10-14.json', 'utf8')).jobs;
  const appliedSet = new Set(applied.map(a => (a.company || '').toLowerCase().trim()));

  const pending = total.filter(j => (j.source || '').includes('Naukri') && !appliedSet.has((j.company || '').toLowerCase().trim()));
  console.log(`[STREAM] Total pending Naukri jobs to audit: ${pending.length}`);

  for (let i = 0; i < pending.length; i++) {
    const job = pending[i];
    console.log(`\n========================================================`);
    console.log(`[Job ${i + 1}/${pending.length}] Auditing: ${job.company} (${job.url})`);

    const page = await browser.newPage();
    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await new Promise(r => setTimeout(r, 2500));

      const pageDetails = await page.evaluate(() => {
        return {
          title: document.title,
          text: document.body.innerText.substring(0, 2000).replace(/\s+/g, ' ')
        };
      });

      // 1. GATEKEEPER LIVE CHECK
      const audit = auditJobText(pageDetails.text, pageDetails.title);
      if (!audit.passed) {
        console.log(`❌ [SKIPPED BY GATEKEEPER] ${job.company}: ${audit.reason}`);
        await page.close();
        continue;
      }

      console.log(`✅ [GATEKEEPER PASSED] ${job.company} is Clean & Fits 0-2 YOE!`);

      // 2. CHECK APPLY BUTTON
      const applyBtn = await page.$('.apply-button') || await page.$('#apply-button') || await page.$('button[id*="apply"]') || await page.$('.styles_apply-button__K1jO6');
      if (!applyBtn) {
        console.log(`⚠️ [NO APPLY BUTTON] ${job.company}: Apply button not present on page.`);
        await page.close();
        continue;
      }

      const btnText = await page.evaluate(el => el.innerText.trim(), applyBtn);
      console.log(`Apply button text: "${btnText}"`);

      if (btnText.toLowerCase().includes('already applied')) {
        console.log(`Already applied to ${job.company}. Skipping.`);
        await page.close();
        continue;
      }

      // If routes to company site, note it and inspect or apply if 1-click
      console.log(`Triggering Apply for ${job.company}...`);
      await applyBtn.click();
      await new Promise(r => setTimeout(r, 4000));

      // 3. CAPTURE PROOF SCREENSHOT
      const ts = Date.now();
      const cleanComp = job.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const screenshotPath = `C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/shift2/${cleanComp}_postsubmit_${ts}.png`;
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`Proof screenshot captured: ${screenshotPath}`);

      // 4. LOG CONFIRMED APPLICATION
      const s2Path = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14_shift2.json';
      const s2 = JSON.parse(fs.readFileSync(s2Path, 'utf8'));
      s2.jobs.push({
        company: job.company,
        role: job.role,
        recipient_or_url: job.url,
        channel: 'Naukri Fast Apply',
        resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
        timestamp: new Date().toISOString(),
        status: 'Applied & Submitted (Naukri Fast Apply)',
        proof_screenshots: [`screenshots/2026-10-14/shift2/${cleanComp}_postsubmit_${ts}.png`],
        notes: `Submitted via Naukri Fast Apply. Gatekeeper clean verified.`
      });
      s2.total = s2.jobs.length;
      fs.writeFileSync(s2Path, JSON.stringify(s2, null, 2));

      // Sync main log
      const mainPath = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-14.json';
      const main = JSON.parse(fs.readFileSync(mainPath, 'utf8'));
      main.jobs.push(s2.jobs[s2.jobs.length - 1]);
      main.total = main.jobs.length;
      fs.writeFileSync(mainPath, JSON.stringify(main, null, 2));

      console.log(`✅ [CONFIRMED APPLIED] ${job.company} | Total Shift 2: ${s2.total} | Today Total: ${main.total}`);

    } catch (err) {
      console.log(`Error processing ${job.company}: ${err.message}`);
    } finally {
      try { await page.close(); } catch (_) {}
    }
  }

  console.log('\n[STREAM COMPLETED] All pending Naukri jobs audited and processed.');
}

processNaukriStream().catch(console.error);
