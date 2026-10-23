/**
 * UNATTENDED AUTOMATIC ATS & PORTAL RUNNER
 * Processes Verified Shift 2 Jobs one-by-one:
 * - Resets fields & types screening profile (Rule 70)
 * - Injects mapped Resume
 * - Handles CAPTCHA: If captcha detected, queues to pending_captcha_queue.json and moves to next (Rule 58.9)
 * - Asserts live confirmation DOM string & saves screenshot to canonical vault
 * - Updates applied_todays_2026-10-21.json (File 5)
 * - Closes tab immediately after submit/skip (Rule 57)
 */

const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const ROOT_DIR = 'C:/mcp/job-search-mcp-engine';
const f4Path = path.join(ROOT_DIR, 'verified_todays_2026-10-21_shift2.json');
const f5Path = path.join(ROOT_DIR, 'applied_todays_2026-10-21.json');
const captchaQueuePath = path.join(ROOT_DIR, 'pending_captcha_queue.json');
const screenshotDir = path.join(ROOT_DIR, 'screenshots/2026-10-21/shift2');
fs.mkdirSync(screenshotDir, { recursive: true });

async function run() {
  console.log('====================================================');
  console.log('🤖 UNATTENDED ATS APPLICATION RUNNER ACTIVE (LUNCH/BREAK MODE)');
  console.log('====================================================');

  const f4 = JSON.parse(fs.readFileSync(f4Path, 'utf8'));
  let f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
  const appliedUrls = new Set((f5.jobs || []).map(j => (j.url || '').toLowerCase()));

  const targets = (f4.jobs || []).filter(j => !appliedUrls.has((j.url || '').toLowerCase()));
  console.log(`Total Unapplied Verified Targets: ${targets.length}`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

  for (let i = 0; i < targets.length; i++) {
    const job = targets[i];
    const prefix = `[Auto-Apply ${i + 1}/${targets.length}]`;
    console.log(`\n${prefix} Processing: ${job.company} — ${job.role}`);
    console.log(`  URL: ${job.url}`);

    let page;
    try {
      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900 });
      await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 45000 });
      await sleep(3000);

      // Check CAPTCHA (Rule 58.9 Unattended Mode)
      const hasCaptcha = await page.evaluate(() => {
        return !!(document.querySelector('iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], .g-recaptcha, .cf-turnstile'));
      });

      if (hasCaptcha) {
        console.log(`  ⚠️ CAPTCHA DETECTED. Queuing to pending_captcha_queue.json and moving to next (Zero wait in break mode)...`);
        let cq = [];
        try { cq = JSON.parse(fs.readFileSync(captchaQueuePath, 'utf8')); } catch(e) {}
        cq.push({ company: job.company, role: job.role, url: job.url, queued_at: new Date().toISOString() });
        fs.writeFileSync(captchaQueuePath, JSON.stringify(cq, null, 2), 'utf8');
        await page.close();
        continue;
      }

      // Handle Greenhouse / Direct ATS form
      const resumeFile = job.resume_mapped || 'Pratik Patidar Resume - MERN Full Stack.pdf';
      const resumePath = path.join(ROOT_DIR, 'resumes', resumeFile);

      console.log(`  -> Injecting fields & resume (${resumeFile})...`);
      await page.evaluate(() => {
        function fill(sel, val) {
          const els = document.querySelectorAll(sel);
          els.forEach(el => {
            el.value = '';
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          });
        }
        fill('input#first_name, input[name*="first_name"], input[name*="firstName"]', 'Pratik');
        fill('input#last_name, input[name*="last_name"], input[name*="lastName"]', 'Patidar');
        fill('input#email, input[name*="email"]', 'pratikpatidar7990@gmail.com');
        fill('input#phone, input[name*="phone"]', '+918269647990');
        fill('input[name*="linkedin"], input[id*="linkedin"]', 'https://www.linkedin.com/in/pratik-patidar');
        fill('input[name*="website"], input[name*="portfolio"]', 'https://pratik-portfolio-nine-orcin.vercel.app');
        fill('input[name*="city"], input[name*="location"]', 'Indore, India');
      });
      await sleep(2000);

      // Upload file
      const fileInput = await page.$('input[type="file"]');
      if (fileInput && fs.existsSync(resumePath)) {
        await fileInput.uploadFile(resumePath);
        await sleep(5000);
      }

      // Click Submit
      console.log('  -> Submitting application...');
      await page.evaluate(() => {
        const btn = document.querySelector('button[type="submit"], input[type="submit"], #submit_app');
        if (btn) btn.click();
      });
      await sleep(6000);

      // Check Live Confirmation (Rule 69)
      const isConfirmed = await page.evaluate(() => {
        const t = document.body.innerText.toLowerCase();
        return t.includes('thank you') || t.includes('application submitted') || t.includes('received your application') || t.includes('application sent');
      });

      console.log(`  -> Live Confirmation Result: ${isConfirmed}`);
      const cleanName = job.company.replace(/[^a-zA-Z0-9]/g, '_');
      const ssPath = path.join(screenshotDir, `${cleanName}_Confirmed.png`);
      await page.screenshot({ path: ssPath, fullPage: true });

      if (isConfirmed) {
        f5 = JSON.parse(fs.readFileSync(f5Path, 'utf8'));
        f5.jobs.push({
          id: `${cleanName.toLowerCase()}_${Date.now()}`,
          company: job.company,
          role: job.role,
          location: job.location,
          url: job.url,
          channel: job.source || 'Direct ATS',
          status: 'CONFIRMED_SUBMITTED',
          applied_at: new Date().toISOString(),
          confirmation_screenshot: ssPath,
          resume_used: resumeFile
        });
        f5.total = f5.jobs.length;
        f5.updated_at = new Date().toISOString();
        fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2), 'utf8');
        console.log(`  ✅ ${job.company} logged into File 5!`);
      }

    } catch (err) {
      console.error(`  ❌ Error processing ${job.company}:`, err.message);
    } finally {
      // Robust tab closing to avoid ProtocolError if already closed
      if (page) {
        try {
          if (!page.isClosed()) await page.close();
        } catch (e) {}
      }
      await sleep(4000); // Rule 2 human pacing jitter
    }
  }

  await browser.disconnect();
  console.log('====================================================');
  console.log('🏁 UNATTENDED BATCH RUN COMPLETED!');
  console.log('====================================================');
}

run();
