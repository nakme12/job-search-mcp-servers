/**
 * WORKER B: ENTERPRISE TOP TIER ATS PORTAL RUNNER
 * Applies to Cashfree Payments & Sarvam AI (Kula.ai ATS)
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { getScreenshotsVault } = require('./canonical_paths.cjs');

const CANDIDATE_PROFILE_PATH = path.resolve('C:/mcp/job-search-mcp-engine/candidate_screening_profile.json');
const APPLIED_FILE = path.resolve('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-15_shift1.json');

const TARGETS = [
  {
    company: 'Cashfree Payments',
    role: 'Frontend Engineer-1',
    url: 'https://careers.kula.ai/cashfree/jobs/4585',
    resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
  },
  {
    company: 'Sarvam AI',
    role: 'Frontend Engineer, Chanakya',
    url: 'https://careers.kula.ai/sarvam-ai/jobs/29375',
    resume: 'Pratik Patidar Resume - MERN Full Stack.pdf'
  }
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runWorkerB() {
  console.log('=== [WORKER B] STARTING CASHFREE & SARVAM AI ATS APPLICATION ===');
  const profile = JSON.parse(fs.readFileSync(CANDIDATE_PROFILE_PATH, 'utf8'));
  const appliedData = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
  const vaultDir = getScreenshotsVault('2026-10-15', 'shift1');

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

  for (let i = 0; i < TARGETS.length; i++) {
    const job = TARGETS[i];
    console.log(`\n[Worker B: ${i + 1}/${TARGETS.length}] ${job.company} — ${job.role}`);

    const alreadyApplied = appliedData.jobs.some(j => j.company.toLowerCase() === job.company.toLowerCase());
    if (alreadyApplied) {
      console.log('Already applied today. Skipping.');
      continue;
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(3000);

      console.log('Populating fields with Rule 70 pre-fill wipe...');
      await page.evaluate((prof) => {
        const inputs = Array.from(document.querySelectorAll('input, textarea'));
        inputs.forEach(input => {
          const name = (input.name || input.id || input.getAttribute('aria-label') || '').toLowerCase();
          function setVal(val) {
            input.value = '';
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
            input.value = val;
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          if (name.includes('name') && !name.includes('company')) setVal(prof.full_name);
          else if (name.includes('email')) setVal(prof.email);
          else if (name.includes('phone') || name.includes('mobile')) setVal(prof.phone.replace('+91', '').trim());
          else if (name.includes('city') || name.includes('location')) setVal(prof.current_location);
          else if (name.includes('linkedin')) setVal(prof.links.linkedin);
          else if (name.includes('portfolio') || name.includes('github') || name.includes('website')) setVal(prof.links.portfolio);
        });
      }, profile);

      const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes', job.resume);
      const fileInput = await page.$('input[type="file"]');
      if (fileInput && fs.existsSync(resumePath)) {
        console.log(`Uploading resume: ${job.resume}`);
        await fileInput.uploadFile(resumePath);
        await sleep(3000);
      }

      console.log('Triggering submit...');
      const submitBtn = await page.$('button[type="submit"], button[class*="submit"], button[id*="submit"]');
      if (submitBtn) {
        await submitBtn.click();
        await sleep(4000);
      }

      const confirmed = await page.evaluate(() => {
        const text = document.body.innerText;
        return /thank you|application submitted|application received|submitted successfully/i.test(text);
      });

      if (confirmed) {
        const cleanComp = job.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const shotPath = path.join(vaultDir, `post_submit_${cleanComp}_${Date.now()}.png`);
        await page.screenshot({ path: shotPath, fullPage: true });
        console.log(`✅ CONFIRMATION ASSERTED! Saved: ${shotPath}`);

        appliedData.jobs.push({
          company: job.company,
          role: job.role,
          url: job.url,
          channel: 'Direct Kula.ai ATS Application',
          proof_screenshot: shotPath,
          status: 'APPLIED_CONFIRMED',
          notes: `Submitted via Worker B on ${new Date().toISOString()}`,
          timestamp: new Date().toISOString()
        });
        appliedData.total = appliedData.jobs.length;
        fs.writeFileSync(APPLIED_FILE, JSON.stringify(appliedData, null, 2));
        await page.close();
      } else {
        console.log('⚠️ Requires review/captcha. Keeping tab open.');
      }

    } catch (e) {
      console.error(`Error on ${job.company}:`, e.message);
    }
  }

  browser.disconnect();
}

runWorkerB().catch(console.error);
