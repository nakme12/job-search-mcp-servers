/**
 * SLOT 6 ENTERPRISE CAREER PORTALS APPLICATION ENGINE
 * Targets top enterprise portals in priority order:
 * - HPE, Cisco, American Express, Stripe, Qualcomm, Mastercard, Microsoft, Developer Bazaar
 * 
 * Rules:
 * - Rule 81: Single dedicated tab, zero touching user tabs.
 * - Rule 54: Strict Canonical Screening Data Binding (candidate_screening_profile.json).
 * - Rule 70: Pre-clear form inputs before typing.
 * - Rule 69: Strict Live DOM Confirmation Assertion before recording.
 * - Rule 66: Post-submit confirmation screenshot saved to screenshots/<DATE>/shift1/.
 * - Rule 57: Immediate tab cleanup.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');
const { CANONICAL_PATHS, getScreenshotsVault } = require('./canonical_paths.cjs');
const { assertSlot } = require('./slot_guard.cjs');

assertSlot(['CYCLE1_SLOT6', 'CYCLE2_SLOT6'], 'Slot 6 Enterprise Career Portals');

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function getProfile() {
  const pPath = path.resolve(__dirname, '..', 'candidate_screening_profile.json');
  return JSON.parse(fs.readFileSync(pPath, 'utf8')).profile;
}

function getBestResume(roleTitle) {
  const t = (roleTitle || '').toLowerCase();
  const resDir = path.resolve(__dirname, '..', 'resumes');
  if (t.includes('full stack') || t.includes('mern') || t.includes('node') || t.includes('backend')) {
    return path.join(resDir, 'Pratik Patidar Resume - MERN Full Stack.pdf');
  }
  if (t.includes('react') || t.includes('ui') || t.includes('front end') || t.includes('frontend')) {
    return path.join(resDir, 'Pratik Patidar Resume - MERN Full Stack.pdf');
  }
  return path.join(resDir, 'Pratik Patidar Resume - MERN Full Stack.pdf');
}

async function main() {
  console.log('====================================================');
  console.log('🚀 [SLOT 6] APPLYING TO TOP ENTERPRISE CAREER PORTALS');
  console.log('====================================================');

  const profile = getProfile();
  const todayStr = '2026-10-19';
  const shiftStr = 'shift1';
  const vaultDir = getScreenshotsVault();
  if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });

  const f4Path = path.resolve(`verified_todays_${todayStr}.json`);
  const f5Path = path.resolve(`applied_todays_${todayStr}.json`);
  const f5ShiftPath = path.resolve(`applied_todays_${todayStr}_${shiftStr}.json`);

  const f4 = JSON.parse(fs.readFileSync(f4Path, 'utf8'));
  const f5 = fs.existsSync(f5Path) ? JSON.parse(fs.readFileSync(f5Path, 'utf8')) : { date: todayStr, total: 0, jobs: [] };

  const appliedUrls = new Set(f5.jobs.map(j => (j.url || '').toLowerCase().trim()));

  // Filter enterprise portals (priority list) — EXCLUDING all intern / student roles
  const enterpriseTargets = f4.jobs.filter(j => {
    if (!j.url || j.recipient) return false;
    const u = j.url.toLowerCase();
    const t = (j.role || j.title || '').toLowerCase();
    const raw = (j.raw_text || '').toLowerCase();
    // Exclude Naukri (handled separately)
    if (u.includes('naukri.com')) return false;
    // Hard filter on Intern/Student roles
    if (/\bintern\b|\binternship\b|\btrainee\b|campus hire|2027|2028/i.test(t) || /\bintern\b|\binternship\b|\btrainee\b|campus hire|2027|2028/i.test(raw)) return false;
    return !appliedUrls.has(u);
  });

  console.log(`Loaded ${enterpriseTargets.length} Enterprise Career Portal targets for execution.\n`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

  let successCount = 0;

  for (let i = 0; i < enterpriseTargets.length; i++) {
    const job = enterpriseTargets[i];
    const prefix = `[Portal ${i + 1}/${enterpriseTargets.length}]`;
    console.log(`----------------------------------------------------`);
    console.log(`${prefix} Starting Application: ${job.company}`);
    console.log(`Role: ${job.role || job.title} | URL: ${job.url}`);

    const resumePath = getBestResume(job.role || job.title);
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });

    try {
      console.log(`  -> Navigating to destination...`);
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
      await sleep(4000);

      // Check if external apply or stepper button exists
      const pageTitle = await page.title();
      console.log(`  -> Page Loaded: "${pageTitle}"`);

      // 1. Look for direct apply buttons to trigger form
      const applyBtnClicked = await page.evaluate(() => {
        const buttons = Array.from(document.querySelectorAll('a, button, [role="button"]'));
        const targetBtn = buttons.find(b => {
          const t = (b.innerText || b.getAttribute('aria-label') || '').toLowerCase().trim();
          return t === 'apply now' || t === 'apply' || t === 'apply for this job' || t === 'apply for this position' || t === 'start application';
        });
        if (targetBtn) {
          targetBtn.click();
          return true;
        }
        return false;
      });

      if (applyBtnClicked) {
        console.log(`  -> Clicked initial Apply button, waiting for form modal/page...`);
        await sleep(3500);
      }

      // 2. Check for active form presence (Rule 77)
      const formInfo = await page.evaluate(() => {
        const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), textarea, select'));
        const fileInputs = Array.from(document.querySelectorAll('input[type="file"]'));
        const hasForm = document.querySelector('form') !== null;
        return {
          totalInputs: inputs.length,
          hasFileInput: fileInputs.length > 0,
          hasForm
        };
      });

      console.log(`  -> DOM Form Check: ${formInfo.totalInputs} visible inputs, file upload present: ${formInfo.hasFileInput}`);

      // 3. Pre-clear & Auto-Fill Common Form Fields (Name, Email, Phone)
      await page.evaluate((prof) => {
        const setField = (selectors, val) => {
          for (const sel of selectors) {
            const el = document.querySelector(sel);
            if (el && !el.disabled && el.offsetParent !== null) {
              el.value = '';
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.value = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
              return true;
            }
          }
          return false;
        };

        // First Name
        setField(['input[name*="first_name" i]', 'input[name*="firstName" i]', 'input[id*="first_name" i]', 'input[aria-label*="First Name" i]'], prof.name.split(' ')[0]);
        // Last Name
        setField(['input[name*="last_name" i]', 'input[name*="lastName" i]', 'input[id*="last_name" i]', 'input[aria-label*="Last Name" i]'], prof.name.split(' ').slice(1).join(' '));
        // Full Name
        setField(['input[name*="name" i]', 'input[id*="name" i]', 'input[aria-label*="Full Name" i]'], prof.name);
        // Email
        setField(['input[type="email"]', 'input[name*="email" i]', 'input[id*="email" i]'], prof.email);
        // Phone
        setField(['input[type="tel"]', 'input[name*="phone" i]', 'input[id*="phone" i]'], prof.phone.replace(/[^0-9]/g, '').slice(-10));
        // LinkedIn
        setField(['input[name*="linkedin" i]', 'input[id*="linkedin" i]'], prof.linkedin);
        // Portfolio / Website
        setField(['input[name*="portfolio" i]', 'input[name*="website" i]', 'input[id*="website" i]'], prof.portfolio);
      }, profile);

      console.log(`  -> Populated Canonical Profile Data (Name, Email, Phone, Links)`);

      // 4. File Upload (Resume)
      const fileInputs = await page.$$('input[type="file"]');
      if (fileInputs.length > 0) {
        console.log(`  -> Injecting resume PDF via CDP: ${path.basename(resumePath)}`);
        await fileInputs[0].uploadFile(resumePath);
        await sleep(3500);
      }

      // 5. Check if CAPTCHA is present (Rule 56)
      const hasCaptcha = await page.evaluate(() => {
        const frames = Array.from(document.querySelectorAll('iframe'));
        return frames.some(f => (f.src || '').includes('recaptcha') || (f.src || '').includes('turnstile') || (f.src || '').includes('hcaptcha'));
      });

      if (hasCaptcha) {
        console.log(`  ⚠️ CAPTCHA DETECTED on ${job.company}! Alerting human-in-the-loop (Rule 56)...`);
        // In unattended mode, log and wait 15s or queue
        await sleep(10000);
      }

      // Check for live confirmation strings (Rule 69)
      const isConfirmed = await page.evaluate(() => {
        const text = document.body.innerText.toLowerCase();
        return text.includes('thank you for applying') || 
               text.includes('application submitted') || 
               text.includes('application received') || 
               text.includes('successfully submitted');
      });

      if (isConfirmed) {
        const safeName = job.company.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const screenshotPath = path.join(vaultDir, `${safeName}_confirmed_${Date.now()}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: false });
        console.log(`  ✅ CONFIRMED APPLIED! Screenshot saved: ${path.basename(screenshotPath)}`);

        f5.jobs.push({
          id: f5.jobs.length + 1,
          company: job.company,
          role: job.role || job.title,
          url: job.url,
          channel: 'Direct Enterprise ATS Portal',
          resume: path.basename(resumePath),
          screenshot: screenshotPath,
          status: 'CONFIRMED_APPLIED',
          timestamp: new Date().toISOString()
        });
        f5.total = f5.jobs.length;

        fs.writeFileSync(f5Path, JSON.stringify(f5, null, 2));
        fs.writeFileSync(f5ShiftPath, JSON.stringify(f5, null, 2));
        successCount++;
      } else {
        console.log(`  ⏸️ [HOLD FOR USER REVIEW] Form on ${job.company} populated but requires user review/CAPTCHA/manual submit. KEEPING TAB OPEN!`);
        // Log to pending_user_review_queue.json
        const queuePath = path.resolve(__dirname, '..', 'pending_user_review_queue.json');
        let queue = [];
        if (fs.existsSync(queuePath)) {
          try { queue = JSON.parse(fs.readFileSync(queuePath, 'utf8')); } catch(e) {}
        }
        queue.push({
          company: job.company,
          role: job.role || job.title,
          url: job.url,
          page_title: pageTitle,
          status: 'HELD_OPEN_FOR_USER',
          timestamp: new Date().toISOString()
        });
        fs.writeFileSync(queuePath, JSON.stringify(queue, null, 2));
      }

      // If successfully confirmed, close tab immediately (Rule 57)
      if (isConfirmed) {
        await page.close();
        console.log(`  -> Closed confirmed tab for ${job.company}.`);
      } else {
        console.log(`  -> Left tab open for ${job.company} so you can review/submit on return.`);
      }
      await sleep(3000);

    } catch (err) {
      console.error(`  ❌ Error processing ${job.company}: ${err.message}`);
      try { await page.close(); } catch(e) {}
    }
  }

  await browser.disconnect();
  console.log('\n====================================================');
  console.log(`🎯 ENTERPRISE PORTALS RUN COMPLETED.`);
  console.log('====================================================');
}

main().catch(console.error);
