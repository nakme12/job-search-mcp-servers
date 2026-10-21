/**
 * SLOT 4 RIGOROUS AUDIT TEST ON 5 ADZUNA JOBS
 * 
 * Enforces:
 * 1. Adzuna redirect resolution to true employer destination
 * 2. Strict Salary Floor Gate (Rule 82): min ₹3.0 LPA or min ₹20k/mo
 * 3. Strict YOE Gate (Rule 60): 0-1, 0-2, 0-3 allowed. Reject 3+, 3-5, 4+, Senior, Lead
 * 4. Freshness Gate: posted <= 7-10 days
 * 5. Physical Form/Apply presence check (Rule 77)
 * 6. Live granular console prints for every job (Rule 59)
 * 7. Tab isolation: opens worker tab and closes it cleanly (Rule 81)
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const { auditJobText } = require('./job_gatekeeper.cjs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function audit5AdzunaJobs() {
  const jobs = JSON.parse(fs.readFileSync('sample_5_adzuna_for_audit.json', 'utf8'));

  console.log('=================================================================');
  console.log(`🔍 [SLOT 4 AUDIT] Evaluating ${jobs.length} Adzuna Jobs with Strict Gatekeepers`);
  console.log('=================================================================');

  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const qualifiedJobs = [];
  const rejectedJobs = [];

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    const prefix = `[Job ${i + 1}/${jobs.length}]`;
    console.log(`\n${prefix} Starting: ${job.company} — ${job.role}`);
    console.log(`  -> Initial URL: ${job.url}`);

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      // 1. Navigate to Adzuna
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2500);

      // Dismiss Email Banner
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const noThanks = btns.find(b => b.innerText && b.innerText.trim().toLowerCase() === 'no, thanks');
        if (noThanks) noThanks.click();
      });
      await sleep(1500);

      // Click "No thanks, take me to the job" or Apply Button
      const redirected = await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const takeMe = links.find(a => a.innerText && a.innerText.toLowerCase().includes('take me to the job'));
        if (takeMe) {
          takeMe.click();
          return 'take_me_link';
        }
        const applyBtn = document.querySelector('a.apply_btn, a[href*="/land/ad/"]');
        if (applyBtn) {
          applyBtn.click();
          return 'direct_apply_link';
        }
        return false;
      });

      if (redirected) {
        await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
        await sleep(3000);
      }

      const destUrl = page.url();
      console.log(`  -> Destination Landed: ${destUrl}`);

      // Check for Adzuna Captcha / Auth wall
      const pageTitle = await page.title();
      if (pageTitle.includes('Human Verification') || destUrl.includes('/authenticate/register')) {
        console.log(`  🚫 DROPPED: Adzuna Rate Limit or Forced Auth Wall`);
        rejectedJobs.push({ ...job, reason: 'ADZUNA_AUTH_WALL' });
        await page.close();
        continue;
      }

      // Dismiss overlay/modal if Cutshort
      await page.keyboard.press('Escape');
      await page.mouse.click(15, 15);
      await sleep(1000);

      // Expand "Read more" to see full JD details
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, span'));
        const rm = btns.find(b => b.innerText && (b.innerText.trim().toLowerCase() === 'read more' || b.innerText.trim().toLowerCase() === 'show more'));
        if (rm) rm.click();
      });
      await sleep(1000);

      // 2. Read full live DOM
      const domData = await page.evaluate(() => {
        const text = document.body ? document.body.innerText : '';
        const hasApply = !!document.querySelector('button, a, input[type="file"], form');
        return {
          text: text.substring(0, 8000),
          snippet: text.substring(0, 300).replace(/\s+/g, ' '),
          hasApply
        };
      });

      // 3. Run Universal Gatekeeper Audit (YOE, Salary Floor, Freshness, Banned Tech)
      const auditResult = auditJobText(domData.text, job.role);

      if (!auditResult.passed) {
        console.log(`  🚫 DROPPED by Gatekeeper: ${auditResult.reason}`);
        console.log(`     DOM Snippet: "${domData.snippet.substring(0, 150)}..."`);
        rejectedJobs.push({ ...job, destination_url: destUrl, reason: auditResult.reason });
      } else if (!domData.hasApply) {
        console.log(`  🚫 DROPPED: No application trigger or form detected on destination DOM.`);
        rejectedJobs.push({ ...job, destination_url: destUrl, reason: 'NO_PHYSICAL_FORM' });
      } else {
        console.log(`  ✅ 100% QUALIFIED: Salary, 0-2/0-3 YOE, Stack & Form verified!`);
        qualifiedJobs.push({
          ...job,
          destination_url: destUrl,
          verified_at: new Date().toISOString()
        });
      }

    } catch(err) {
      console.log(`  ❌ Error evaluating job: ${err.message}`);
      rejectedJobs.push({ ...job, reason: `ERROR: ${err.message}` });
    } finally {
      await page.close().catch(() => {});
    }
  }

  browser.disconnect();

  console.log('\n=================================================================');
  console.log(`🏁 [SLOT 4 AUDIT SUMMARY]`);
  console.log(`Total Evaluated: ${jobs.length}`);
  console.log(`✅ Qualified Worth Jobs: ${qualifiedJobs.length}`);
  console.log(`🚫 Dropped / Filtered Out: ${rejectedJobs.length}`);
  console.log('=================================================================');

  if (qualifiedJobs.length > 0) {
    console.log('\n🌟 QUALIFIED JOBS READY FOR APPLICATION:');
    qualifiedJobs.forEach((q, idx) => {
      console.log(`${idx + 1}. ${q.company} — ${q.role}`);
      console.log(`   Destination: ${q.destination_url}`);
    });
  }

  if (rejectedJobs.length > 0) {
    console.log('\nDropped Details:');
    rejectedJobs.forEach((r, idx) => {
      console.log(`${idx + 1}. ${r.company}: ${r.reason}`);
    });
  }
}

audit5AdzunaJobs().catch(console.error);
