/**
 * DEDICATED INDEED APPLICATION ENGINE
 * 
 * Rules enforced:
 * - Rule 70: Pre-fill clean (wipe inputs before typing)
 * - Rule 62: Country code strict India (+91)
 * - Rule 56: Mandatory live CAPTCHA user alert protocol (Wait for solve)
 * - Rule 69: Assert explicit DOM confirmation string ("Application submitted" / "Thank you")
 * - Rule 66: Save proof screenshot strictly in getScreenshotsVault()
 * - Rule 57: Immediate post-apply tab cleanup
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { getScreenshotsVault } = require('./canonical_paths.cjs');

const CANDIDATE_PROFILE_PATH = path.resolve('C:/mcp/job-search-mcp-engine/candidate_screening_profile.json');
const APPLIED_FILE = path.resolve('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-15_shift1.json');
const VERIFIED_FILE = path.resolve('C:/mcp/job-search-mcp-engine/verified_todays_2026-10-15_shift1.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runIndeedWorker() {
  console.log('====================================================');
  console.log('🚀 RUNNING DEDICATED INDEED APPLICATION ENGINE');
  console.log('====================================================');

  const profile = JSON.parse(fs.readFileSync(CANDIDATE_PROFILE_PATH, 'utf8'));
  const verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf8'));
  const appliedData = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));

  const indeedJobs = (verifiedData.jobs || []).filter(j => 
    (j.url && j.url.includes('indeed.com')) || (j.source && j.source.toLowerCase().includes('indeed'))
  );

  console.log(`Found ${indeedJobs.length} Indeed verified jobs to apply.`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const vaultDir = getScreenshotsVault('2026-10-15', 'shift1');

  for (let i = 0; i < indeedJobs.length; i++) {
    const job = indeedJobs[i];
    const prefix = `[Indeed Apply ${i + 1}/${indeedJobs.length}]`;
    console.log(`\n${prefix} ${job.company} — ${job.role}`);
    console.log(`  Target URL: ${job.url}`);

    // Check if already applied
    const alreadyApplied = appliedData.jobs.some(j => 
      (j.url && j.url.toLowerCase() === job.url.toLowerCase()) || 
      (j.company && j.company.toLowerCase() === job.company.toLowerCase())
    );
    if (alreadyApplied) {
      console.log(`  -> Already applied today! Skipping.`);
      continue;
    }

    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await sleep(2500);

      // Check if page has Apply button
      console.log('  Looking for Apply button...');
      const applyBtnSelector = 'button[id*="apply"], a[id*="apply"], button[class*="apply"], a[class*="apply"], button[data-indeed-apply*="true"]';
      const applyBtn = await page.$(applyBtnSelector);

      if (!applyBtn) {
        console.log('  ⚠️ No direct apply button found on Indeed preview. Checking external redirect...');
        const extApplyBtn = await page.$('a[href*="indeed.com/applystart"], a[href*="apply"]');
        if (extApplyBtn) {
          await extApplyBtn.click();
          await sleep(3000);
        } else {
          console.log('  🚫 Could not find clickable apply trigger. Moving to next.');
          await page.close();
          continue;
        }
      } else {
        await applyBtn.click();
        await sleep(3000);
      }

      // Check if new tab or iframe popped up
      const pages = await browser.pages();
      let formPage = pages[pages.length - 1]; // active or newly opened tab
      await formPage.bringToFront();

      // Check for Captcha (Rule 56)
      const hasCaptcha = await formPage.evaluate(() => {
        return !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="turnstile"], div[class*="captcha"]');
      });

      if (hasCaptcha) {
        console.log(`\n🚨 [RULE 56 CAPTCHA ALERT] CAPTCHA detected on ${job.company}! Waiting 25s for human solve...`);
        await sleep(25000);
      }

      // Fill common candidate inputs (Rule 70: wipe clean first)
      console.log('  Checking & populating form inputs...');
      await formPage.evaluate((prof) => {
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

          if (name.includes('name') && !name.includes('company')) {
            setVal(prof.full_name);
          } else if (name.includes('email')) {
            setVal(prof.email);
          } else if (name.includes('phone') || name.includes('mobile')) {
            setVal(prof.phone.replace('+91', '').trim());
          } else if (name.includes('city') || name.includes('location')) {
            setVal(prof.current_location);
          } else if (name.includes('linkedin')) {
            setVal(prof.links.linkedin);
          } else if (name.includes('portfolio') || name.includes('github') || name.includes('website')) {
            setVal(prof.links.portfolio);
          }
        });
      }, profile);

      await sleep(1500);

      // Upload Resume if input exists (Rule 58 Step 3)
      const resumeFile = job.resume_mapped || 'Pratik Patidar Resume - React Developer.pdf';
      const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes', resumeFile);
      const fileInput = await formPage.$('input[type="file"]');
      if (fileInput && fs.existsSync(resumePath)) {
        console.log(`  Uploading resume: ${resumeFile}`);
        await fileInput.uploadFile(resumePath);
        await sleep(3000);
      }

      // Look for Continue / Submit / Review button
      console.log('  Looking for submit/continue button...');
      const submitBtn = await formPage.$('button[type="submit"], button[id*="form-submit"], button[class*="submit"], button[aria-label*="Submit"], button[class*="continue"]');
      
      if (submitBtn) {
        console.log('  Triggering submit button...');
        await submitBtn.click();
        await sleep(4000);
      }

      // Check for Confirmation (Rule 69)
      const confirmation = await formPage.evaluate(() => {
        const text = document.body.innerText;
        return /thank you|application submitted|application received|submitted successfully|your application has been sent/i.test(text);
      });

      if (confirmation) {
        const cleanComp = job.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const screenshotName = `post_submit_indeed_${cleanComp}_${Date.now()}.png`;
        const screenshotPath = path.join(vaultDir, screenshotName);

        await formPage.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`  ✅ CONFIRMATION DETECTED! Screenshot saved: ${screenshotPath}`);

        // Record in applied_todays file
        appliedData.jobs.push({
          company: job.company,
          role: job.role,
          url: job.url,
          channel: 'Direct Indeed Application',
          proof_screenshot: screenshotPath,
          status: 'APPLIED_CONFIRMED',
          notes: `Submitted via Indeed Engine on ${new Date().toISOString()}`,
          timestamp: new Date().toISOString()
        });
        appliedData.total = appliedData.jobs.length;
        fs.writeFileSync(APPLIED_FILE, JSON.stringify(appliedData, null, 2));

        // Rule 57: Close completed tab
        await formPage.close();
      } else {
        console.log(`  ⚠️ Form submitted or multi-step/review required. Keeping tab open for review.`);
      }

    } catch (err) {
      console.error(`  ❌ Error processing ${job.company}:`, err.message);
      try { await page.close(); } catch(e) {}
    }
  }

  browser.disconnect();
  console.log('\n====================================================');
  console.log(`🏁 INDEED APPLICATION ENGINE RUN FINISHED`);
  console.log('====================================================');
}

runIndeedWorker().catch(console.error);
