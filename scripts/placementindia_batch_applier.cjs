const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const SCREENSHOT_DIR = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1';
if (!fs.existsSync(SCREENSHOT_DIR)) fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });

const F5_PATH = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
const HARVEST_PATH = 'C:\\mcp\\placementindia_harvested_jobs.json';
const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';

async function fillPlacementIndiaModal(page) {
  try {
    // 1. Email
    await page.evaluate(() => {
      const emailEl = document.querySelector('#email, input[name="email"], #userEmail, input[placeholder*="Email"]');
      if (emailEl && !emailEl.value) {
        emailEl.value = 'pratikpatidar7990@gmail.com';
        emailEl.dispatchEvent(new Event('input', { bubbles: true }));
        emailEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 2. Gender (Male)
    await page.evaluate(() => {
      const g = document.querySelector('#gender, select[name="gender"]');
      if (g) {
        for (const opt of g.options) {
          if (opt.value === 'M' || opt.text.toLowerCase().includes('mr') || opt.text.toLowerCase().includes('male')) {
            g.value = opt.value;
            g.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      }
      const radios = Array.from(document.querySelectorAll('input[type="radio"][name*="gender"]'));
      for (const r of radios) {
        if (r.value.toLowerCase().startsWith('m')) r.click();
      }
    });

    // 3. Qualification (B.Tech)
    await page.evaluate(() => {
      const q = document.querySelector('#qualification, select[name="qualification"]');
      if (q) {
        for (const opt of q.options) {
          if (opt.text.toLowerCase().includes('b.tech') || opt.text.toLowerCase().includes('graduate') || opt.text.toLowerCase().includes('bachelor') || opt.text.toLowerCase().includes('be')) {
            q.value = opt.value;
            q.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      }
    });

    // 4. Experience (1 Year)
    await page.evaluate(() => {
      const exp = document.querySelector('#total_work_exp_year, select[name="total_work_exp_year"]');
      if (exp) {
        for (const opt of exp.options) {
          if (opt.value === '1' || opt.text.includes('1 Year') || opt.value === '1.5') {
            exp.value = opt.value;
            exp.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      }
    });

    // 5. City & Locality
    await page.evaluate(() => {
      const city = document.querySelector('#search_city, input[name="city"]');
      if (city && !city.value) {
        city.value = 'Indore';
        city.dispatchEvent(new Event('input', { bubbles: true }));
        city.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const loc = document.querySelector('#locality, input[name="locality"]');
      if (loc && !loc.value) {
        loc.value = 'Vijay Nagar';
        loc.dispatchEvent(new Event('input', { bubbles: true }));
        loc.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 6. Resume file injection
    const fileEl = await page.$('#upload_resume, input[type="file"]');
    if (fileEl && fs.existsSync(RESUME_PATH)) {
      try {
        await fileEl.uploadFile(RESUME_PATH);
      } catch (e) {}
    }

  } catch (e) {}
}

(async () => {
  let browser;
  try {
    console.log('[PlacementIndia Applier] Connecting to Brave (Port 9222)...');
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

    let f5 = JSON.parse(fs.readFileSync(F5_PATH, 'utf8'));
    console.log(`[PlacementIndia Applier] Initial Total Confirmed Today: ${f5.total}/100`);

    const harvest = JSON.parse(fs.readFileSync(HARVEST_PATH, 'utf8'));
    console.log(`[PlacementIndia Applier] Loaded ${harvest.length} harvested jobs.`);

    const appliedUrls = new Set(f5.jobs.map(j => (j.url || '').toLowerCase().split('?')[0]));
    const appliedComps = new Set(f5.jobs.map(j => (j.company || '').toLowerCase().trim()));

    const candidateJobs = harvest.filter(j => {
      const u = (j.jobUrl || '').toLowerCase().split('?')[0];
      const c = (j.company || '').toLowerCase().trim();
      const t = (j.title || '').toLowerCase();
      // Skip female only
      if (t.includes('female') || t.includes('women only') || t.includes('girl')) return false;
      return !appliedUrls.has(u) && !appliedComps.has(c);
    });

    console.log(`[PlacementIndia Applier] Eligible candidates in queue: ${candidateJobs.length}`);

    let appliedThisRun = 0;

    for (let i = 0; i < candidateJobs.length; i++) {
      const job = candidateJobs[i];
      const safeName = (job.company || 'Job').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
      const urlParts = (job.jobUrl || '').split('-');
      const jobId = urlParts[urlParts.length - 1]?.replace('.htm', '') || `${i + 1}`;

      console.log(`\n==============================================================`);
      console.log(`[PI Job ${i + 1}/${candidateJobs.length}] Company: ${job.company} | Role: ${job.title}`);
      console.log(`URL: ${job.jobUrl}`);

      let page;
      try {
        page = await browser.newPage();
        await page.goto(job.jobUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await sleep(2500);

        // Check freshness on live DOM (Rule 4 & user mandate)
        const isStale = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          if (text.includes('2021') || text.includes('2022') || text.includes('2023') || text.includes('2024') || text.includes('2025')) return 'Old Year';
          if (text.includes('30+ days') || text.includes('months ago') || text.includes('month ago') || text.includes('3+ weeks') || text.includes('2+ weeks')) return 'Stale > 14 days';
          return null;
        });

        if (isStale) {
          console.log(`  ❌ [STALE_JOB_DISCARDED]: PlacementIndia posting is not fresh (${isStale}). Skipping.`);
          await page.close();
          continue;
        }

        // Check if already applied on PI account
        const preAudit = await page.evaluate(() => {
          const text = document.body.innerText;
          const isApplied = /applied on \d{2}\/\d{2}\/\d{4}|already applied/i.test(text);
          const applyBtn = Array.from(document.querySelectorAll('a, button')).find(b => (b.innerText || '').trim().toLowerCase() === 'apply');
          return { isApplied, hasApplyBtn: !!applyBtn, btnText: applyBtn?.innerText };
        });

        if (preAudit.isApplied) {
          console.log(`  ℹ️ [ALREADY_APPLIED_ON_ACCOUNT]: Marked as applied historically. Skipping.`);
          await page.close();
          continue;
        }

        if (!preAudit.hasApplyBtn) {
          console.log(`  ⚠️ No Apply button found (possibly expired or external). Skipping.`);
          await page.close();
          continue;
        }

        console.log(`  -> Clicking Apply button: "${preAudit.btnText}"...`);
        await page.evaluate(() => {
          const applyBtn = Array.from(document.querySelectorAll('a, button')).find(b => (b.innerText || '').trim().toLowerCase() === 'apply');
          if (applyBtn) applyBtn.click();
        });

        await sleep(2000);

        // Fill any modal fields if modal appeared
        await fillPlacementIndiaModal(page);
        await sleep(1000);

        // Click Submit Application in modal
        const clickedModalSubmit = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('.modal button, .popup button, form button, input[type="submit"], a.btn'));
          const sub = btns.find(b => (b.innerText || b.value || '').trim().toLowerCase() === 'submit application');
          if (sub) {
            sub.click();
            return true;
          }
          return false;
        });

        if (clickedModalSubmit) {
          console.log(`  -> Clicked 'Submit Application' in modal...`);
          await sleep(3500);
        }

        // Assert confirmation
        const confirmed = await page.evaluate(() => {
          const text = document.body.innerText.toLowerCase();
          return text.includes('you have applied successfully') ||
                 text.includes('successfully applied') ||
                 text.includes('application submitted') ||
                 text.includes('applied on') ||
                 text.includes('thank you');
        });

        if (confirmed) {
          const ssFilename = `placementindia_${safeName}_${jobId}.png`;
          const ssPath = path.join(SCREENSHOT_DIR, ssFilename);
          await page.screenshot({ path: ssPath, fullPage: false });
          console.log(`  🎉 [CONFIRMED APPLIED]: Screenshot saved: ${ssPath}`);

          f5.total += 1;
          appliedThisRun += 1;
          f5.jobs.push({
            id: f5.total,
            company: job.company,
            role: job.title,
            channel: 'PlacementIndia Submission',
            url: job.jobUrl,
            status: 'CONFIRMED_APPLIED',
            screenshot: `screenshots/2026-10-19/shift1/${ssFilename}`,
            timestamp: new Date().toISOString()
          });

          fs.writeFileSync(F5_PATH, JSON.stringify(f5, null, 2), 'utf8');
          console.log(`  >>> [COUNT UPDATE]: Total Confirmed Today: ${f5.total}/100 (This run: +${appliedThisRun}) <<<`);
        } else {
          console.log(`  Notice: Application clicked, waiting confirmation or requires extra inputs.`);
        }

        // Rule 57: Immediate tab cleanup
        await page.close();

      } catch (err) {
        console.error(`  ⚠️ Error on job: ${err.message}. Skipping to next.`);
        if (page) {
          try { await page.close(); } catch (e) {}
        }
      }

      // Gentle human spacing to prevent rate limit
      console.log(`  -> Pausing 8s before next job...`);
      await sleep(8000);
    }

    console.log(`\n==============================================================`);
    console.log(`[PlacementIndia Applier Complete] Total Applied This Run: ${appliedThisRun}`);
    console.log(`Final Total Confirmed Today: ${f5.total}/100`);

  } catch (fatal) {
    console.error('Fatal error:', fatal.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
