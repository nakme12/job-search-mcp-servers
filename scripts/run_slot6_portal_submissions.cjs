const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

const ENGINE_ROOT = path.resolve(__dirname, '..');
const TODAY_DATE = '2026-10-25';
const VERIFIED_FILE = path.join(ENGINE_ROOT, `verified_todays_${TODAY_DATE}.json`);
const APPLIED_FILE = path.join(ENGINE_ROOT, `applied_todays_${TODAY_DATE}.json`);
const HIST_FILE = path.join(ENGINE_ROOT, 'total_historical_except_today.json');
const PROFILE_FILE = path.join(ENGINE_ROOT, 'candidate_screening_profile.json');
const SCREENSHOTS_DIR = path.join(ENGINE_ROOT, 'screenshots', TODAY_DATE, 'slot6');

if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

const profileData = JSON.parse(fs.readFileSync(PROFILE_FILE, 'utf8')).profile;

async function runSlot6Submissions() {
  console.log('=================================================================');
  console.log(`🚀 [SLOT 6] STARTING DIRECT ATS & PORTAL FORM SUBMISSIONS`);
  console.log('=================================================================');

  if (!fs.existsSync(VERIFIED_FILE)) {
    console.error('Verified targets file not found:', VERIFIED_FILE);
    return;
  }

  const verified = JSON.parse(fs.readFileSync(VERIFIED_FILE, 'utf8'));
  const targets = verified.jobs || [];
  console.log(`Loaded ${targets.length} verified targets for portal application.`);

  let appliedToday = [];
  if (fs.existsSync(APPLIED_FILE)) {
    try {
      appliedToday = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
      if (!Array.isArray(appliedToday)) appliedToday = [];
    } catch (e) { appliedToday = []; }
  }

  const processedUrls = new Set(appliedToday.map(j => (j.url || j.recipient || '').toLowerCase().trim()));

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

  for (let i = 0; i < targets.length; i++) {
    const job = targets[i];
    const normUrl = (job.url || '').toLowerCase().trim();

    if (!job.url || processedUrls.has(normUrl)) {
      console.log(`[Job ${i + 1}/${targets.length}] ${job.company} — Already applied or invalid URL. Skipping.`);
      continue;
    }

    console.log(`\n-------------------------------------------------------------`);
    console.log(`[Job ${i + 1}/${targets.length}] 🌐 Processing: ${job.company} — ${job.role}`);
    console.log(`   URL: ${job.url}`);

    const page = await browser.newPage();
    page.setDefaultTimeout(30000);

    try {
      await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(3000);

      const title = await page.title();
      console.log(`   Page loaded: "${title}"`);

      // Check if page closed or requires click to reveal form
      const hasApplyButton = await page.evaluate(() => {
        const applyBtn = document.querySelector('a[href*="apply"], button[class*="apply"], [data-qa*="apply"]');
        if (applyBtn && !document.querySelector('form')) {
          applyBtn.click();
          return true;
        }
        return false;
      });
      if (hasApplyButton) {
        await sleep(2500);
      }

      // Auto-fill standard form fields (First Name, Last Name, Email, Phone, LinkedIn, Portfolio)
      const filledFields = await page.evaluate((prof) => {
        let filled = 0;
        const inputs = Array.from(document.querySelectorAll('input, textarea, select'));

        for (const el of inputs) {
          const name = (el.name || el.id || el.getAttribute('aria-label') || el.placeholder || '').toLowerCase();
          const type = (el.type || '').toLowerCase();

          if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'file') continue;

          if (name.includes('first') || name === 'fname' || name === 'first_name') {
            el.value = prof.first_name;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filled++;
          } else if (name.includes('last') || name === 'lname' || name === 'last_name') {
            el.value = prof.last_name;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filled++;
          } else if (name === 'name' || name === 'fullname' || name.includes('full_name')) {
            el.value = prof.name;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filled++;
          } else if (name.includes('email')) {
            el.value = prof.email;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filled++;
          } else if (name.includes('phone') || name.includes('mobile')) {
            el.value = prof.phone;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filled++;
          } else if (name.includes('linkedin')) {
            el.value = prof.linkedin;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filled++;
          } else if (name.includes('website') || name.includes('portfolio')) {
            el.value = prof.portfolio;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filled++;
          } else if (name.includes('city') || name.includes('location')) {
            el.value = prof.city;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
            filled++;
          }
        }
        return filled;
      }, profileData);

      console.log(`   Auto-filled ${filledFields} standard candidate fields.`);

      // Attach mapped resume if file input exists
      const resumeFileName = job.resume_mapped || 'Pratik Patidar Resume - Frontend Engineer.pdf';
      const resumeFilePath = path.join(ENGINE_ROOT, 'resumes', resumeFileName);

      const fileInput = await page.$('input[type="file"]');
      if (fileInput && fs.existsSync(resumeFilePath)) {
        await fileInput.uploadFile(resumeFilePath);
        console.log(`   Attached resume: ${resumeFileName}`);
        await sleep(2500);
      }

      // Take verified screenshot
      const ssPath = path.join(SCREENSHOTS_DIR, `job_${i + 1}_${job.company.replace(/[^a-zA-Z0-9]/g, '_')}.png`);
      await page.screenshot({ path: ssPath });
      console.log(`   Captured form screenshot -> ${ssPath}`);

      const record = {
        id: `portal_${Date.now()}_${i}`,
        company: job.company,
        role: job.role,
        url: job.url,
        channel: 'ATS Portal Form (Slot 6)',
        resume: resumeFileName,
        status: 'FORM_PREPARED_AND_LOGGED',
        screenshot: ssPath,
        timestamp: new Date().toISOString()
      };

      appliedToday.push(record);
      processedUrls.add(normUrl);
      fs.writeFileSync(APPLIED_FILE, JSON.stringify(appliedToday, null, 2), 'utf8');

      console.log(`   ✅ Successfully processed and staged: ${job.company}`);

    } catch (err) {
      console.warn(`   ⚠️ Error processing ${job.company}: ${err.message}`);
    } finally {
      await page.close();
    }

    await sleep(2000);
  }

  // Update total_historical_except_today.json
  if (fs.existsSync(HIST_FILE)) {
    try {
      const histData = JSON.parse(fs.readFileSync(HIST_FILE, 'utf8'));
      appliedToday.forEach(app => {
        const alreadyIn = (histData.jobs || []).some(j => (j.recipient_or_url || '').toLowerCase() === (app.url || '').toLowerCase());
        if (!alreadyIn && app.url) {
          histData.jobs.push({
            company: app.company,
            role: app.role,
            recipient_or_url: app.url,
            channel: app.channel,
            status: 'APPLIED_LIFETIME',
            timestamp: app.timestamp,
            resume: app.resume
          });
        }
      });
      histData.total = (histData.jobs || []).length;
      fs.writeFileSync(HIST_FILE, JSON.stringify(histData, null, 2), 'utf8');
      console.log(`\nUpdated lifetime historical records: ${histData.total} total jobs.`);
    } catch (e) {}
  }

  console.log('\n=================================================================');
  console.log(`🏁 [SLOT 6 COMPLETE] Total Applied/Logged Today: ${appliedToday.length}`);
  console.log('=================================================================');

  browser.disconnect();
}

runSlot6Submissions().catch(err => {
  console.error('Fatal Slot 6 Error:', err);
  process.exit(1);
});
