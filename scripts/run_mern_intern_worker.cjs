/**
 * MERN STACK & INTERN APPLICATION RUNNER (AUTOMATED VIA BRAVE CDP)
 * Targets verified Indian MERN stack roles & interns:
 * 1. Octalbees — MERN Stack Developer Intern (India)
 * 2. Rapid Acceleration Partners — MERN Stack Intern (Chennai)
 * 3. Synorus — Next.js Developer - Intern (India)
 * 4. Acme Services — MERN Stack Developer (Bangalore)
 * 5. Ipangram Digital Services — MERN Stack Developer (India)
 * 6. Tedroox Technologies — Fullstack Developer (MERN Stack) (Bangalore)
 * 7. TheKalki — Web Developer (MERN Stack) (Madurai)
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { getScreenshotsVault } = require('./canonical_paths.cjs');

const CANDIDATE_PROFILE_PATH = path.resolve('C:/mcp/job-search-mcp-engine/candidate_screening_profile.json');
const APPLIED_FILE = path.resolve('C:/mcp/job-search-mcp-engine/applied_todays_2026-10-15_shift1.json');
const VERIFIED_FILE = path.resolve('C:/mcp/job-search-mcp-engine/verified_todays_2026-10-15_shift1.json');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function runMernInternWorker() {
  console.log('====================================================');
  console.log('🔥 RUNNING DEDICATED MERN STACK & INTERN APPLICATION WORKER');
  console.log('====================================================');

  const profile = JSON.parse(fs.readFileSync(CANDIDATE_PROFILE_PATH, 'utf8'));
  const verifiedData = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf8'));
  const appliedData = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));

  const mernTargets = (verifiedData.jobs || []).filter(j => 
    j.role.toLowerCase().includes('mern') || j.role.toLowerCase().includes('intern')
  );

  console.log(`Found ${mernTargets.length} MERN Stack & Intern target jobs in verified queue.`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const vaultDir = getScreenshotsVault('2026-10-15', 'shift1');

  for (let i = 0; i < mernTargets.length; i++) {
    const job = mernTargets[i];
    const prefix = `[MERN Target ${i + 1}/${mernTargets.length}]`;
    console.log(`\n${prefix} ${job.company} — ${job.role} (${job.location})`);
    console.log(`  URL: ${job.url}`);

    // Skip if email or already applied
    if (job.recipient && job.recipient.includes('@')) {
      console.log(`  -> Direct Email Lead (Already handled). Skipping.`);
      continue;
    }
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

      // If Adzuna details page, follow destination redirect to company portal
      if (job.url.includes('adzuna.in/details')) {
        console.log('  Following Adzuna apply/redirect button to destination company portal...');
        const destHref = await page.evaluate(() => {
          const btn = document.querySelector('a.apply_button, a[href*="redirect"], a[href*="apply"]');
          return btn ? btn.href : null;
        });
        if (destHref) {
          console.log(`  Navigating to destination: ${destHref}`);
          await page.goto(destHref, { waitUntil: 'domcontentloaded', timeout: 30000 });
          await sleep(3500);
        }
      }

      // Check for live form / inputs
      const formDetails = await page.evaluate(() => {
        const title = document.title;
        const text = document.body.innerText;
        const inputs = Array.from(document.querySelectorAll('input, textarea, select')).map(el => el.name || el.id || el.type);
        const hasForm = !!document.querySelector('form, input[type="file"], input[type="email"], button[type="submit"]');
        return { title, hasForm, inputCount: inputs.length, sampleText: text.slice(0, 300).replace(/\n+/g, ' ') };
      });

      console.log(`  Destination Page: "${formDetails.title}"`);
      console.log(`  Form Detected: ${formDetails.hasForm} | Total Inputs: ${formDetails.inputCount}`);

      // Check for CAPTCHA (Rule 56)
      const hasCaptcha = await page.evaluate(() => {
        return !!document.querySelector('iframe[src*="recaptcha"], iframe[src*="turnstile"], div[class*="captcha"]');
      });
      if (hasCaptcha) {
        console.log(`\n🚨 [RULE 56 CAPTCHA ALERT] CAPTCHA detected on ${job.company}! Waiting 25s for human solve...`);
        await sleep(25000);
      }

      // Populate Candidate Info (Rule 70 pre-fill wipe)
      console.log('  Populating candidate information with Rule 70 pre-fill reset...');
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

      // Upload MERN Resume
      const resumeFile = 'Pratik Patidar Resume - MERN Full Stack.pdf';
      const resumePath = path.resolve('C:/mcp/job-search-mcp-engine/resumes', resumeFile);
      const fileInput = await page.$('input[type="file"]');
      if (fileInput && fs.existsSync(resumePath)) {
        console.log(`  Uploading authorized resume: ${resumeFile}`);
        await fileInput.uploadFile(resumePath);
        await sleep(3000);
      }

      // Trigger Submit if ready
      console.log('  Checking submit trigger...');
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], button[id*="submit"], button[class*="submit"], button[aria-label*="Submit"]');
      if (submitBtn) {
        console.log('  Triggering form submit button...');
        await submitBtn.click();
        await sleep(4000);
      }

      // Check for Confirmation (Rule 69)
      const confirmation = await page.evaluate(() => {
        const text = document.body.innerText;
        return /thank you|application submitted|application received|submitted successfully|applied successfully/i.test(text);
      });

      if (confirmation) {
        const cleanComp = job.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const screenshotName = `post_submit_mern_${cleanComp}_${Date.now()}.png`;
        const screenshotPath = path.join(vaultDir, screenshotName);

        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`  ✅ CONFIRMATION ASSERTED! Screenshot saved: ${screenshotPath}`);

        appliedData.jobs.push({
          company: job.company,
          role: job.role,
          url: job.url,
          channel: 'Direct MERN Form Application',
          proof_screenshot: screenshotPath,
          status: 'APPLIED_CONFIRMED',
          notes: `Submitted via MERN Worker on ${new Date().toISOString()}`,
          timestamp: new Date().toISOString()
        });
        appliedData.total = appliedData.jobs.length;
        fs.writeFileSync(APPLIED_FILE, JSON.stringify(appliedData, null, 2));

        // Rule 57: Close completed tab
        await page.close();
      } else {
        console.log(`  ⚠️ Form open / review required. Tab left open for verification.`);
      }

    } catch (err) {
      console.error(`  ❌ Error processing ${job.company}:`, err.message);
      try { await page.close(); } catch(e) {}
    }
  }

  browser.disconnect();
  console.log('\n====================================================');
  console.log(`🏁 MERN STACK & INTERN WORKER RUN COMPLETE`);
  console.log('====================================================');
}

runMernInternWorker().catch(console.error);
