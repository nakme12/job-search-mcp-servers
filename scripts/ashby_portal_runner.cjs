const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');

async function runAshbyPortal(job) {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  let applyUrl = job.url.trim();
  if (!applyUrl.endsWith('/application')) {
    applyUrl = applyUrl.replace(/\/+$/, '') + '/application';
  }

  console.log(`\n======================================================`);
  console.log(`[Ashby Runner] Starting: ${job.company} — ${job.role}`);
  console.log(`URL: ${applyUrl}`);

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0.0.0 Safari/537.36');

  try {
    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3500));

    const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
    if (/this job is no longer available|position has been closed|404/i.test(pageText)) {
      console.log(`❌ Ashby role closed / unavailable: ${job.company}`);
      await page.close();
      return { status: 'CLOSED' };
    }

    console.log(`[1/5] Injecting Resume: ${path.basename(RESUME_PATH)}`);
    const fileInputs = await page.$$('input[type="file"]');
    for (const f of fileInputs) {
      try {
        await f.uploadFile(RESUME_PATH);
      } catch (e) {}
    }

    console.log(`[2/5] Filling Standard Fields (Name, Email, Phone, Socials)...`);
    await page.evaluate((prof) => {
      function setInput(selector, val) {
        const el = document.querySelector(selector);
        if (el) {
          el.value = '';
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Name
      setInput('input[name="_systemfield_name"], input[id="_systemfield_name"]', prof.name);
      // Email
      setInput('input[name="_systemfield_email"], input[id="_systemfield_email"]', prof.email);
      // Phone
      const phoneEl = document.querySelector('input[type="tel"]') || document.querySelector('input[name*="phone" i]');
      if (phoneEl) {
        phoneEl.value = '';
        phoneEl.value = prof.phone;
        phoneEl.dispatchEvent(new Event('input', { bubbles: true }));
        phoneEl.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Socials & Links
      const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"]'));
      for (const inp of allInputs) {
        const label = (inp.getAttribute('aria-label') || (inp.labels && inp.labels[0] ? inp.labels[0].innerText : '') || inp.placeholder || inp.name || '').toLowerCase();
        if (label.includes('linkedin')) {
          inp.value = prof.linkedin;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (label.includes('github') || label.includes('website') || label.includes('portfolio')) {
          inp.value = prof.portfolio;
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        } else if (label.includes('react') || label.includes('javascript') || label.includes('proficiency')) {
          inp.value = 'Yes, 1.5 years of professional experience building modern full-stack web applications with React.js, Next.js, TypeScript, Node.js, and REST APIs.';
          inp.dispatchEvent(new Event('input', { bubbles: true }));
          inp.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      // Radio consent (text messages)
      const yesRadio = document.querySelector('input[type="radio"][value*="yes" i], input[type="radio"][aria-label*="consent" i]');
      if (yesRadio) {
        yesRadio.click();
        yesRadio.checked = true;
      }
    }, PROFILE);

    await new Promise(r => setTimeout(r, 1500));

    // Check if CAPTCHA exists
    const hasCaptcha = await page.evaluate(() => {
      const gRecaptcha = document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], textarea[name="g-recaptcha-response"]');
      return !!gRecaptcha;
    });

    console.log(`[3/5] CAPTCHA Detected: ${hasCaptcha ? 'YES' : 'NO'}`);

    if (hasCaptcha) {
      console.log(`🚨 CAPTCHA REQUIRED for ${job.company} — Holding tab open for user review / solve.`);
      // Bring tab to front so user sees it
      await page.bringToFront();
      return { status: 'HELD_FOR_CAPTCHA', page, url: applyUrl, company: job.company };
    }

    // Try submitting if no captcha
    console.log(`[4/5] Submitting Application...`);
    const submitBtn = await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /submit application|apply/i.test(b.innerText.trim()));
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });

    await new Promise(r => setTimeout(r, 5000));
    const confirmText = await page.evaluate(() => document.body ? document.body.innerText : '');
    const isSubmitted = /thank you|application submitted|received your application|success/i.test(confirmText);

    if (isSubmitted) {
      console.log(`✅ [5/5] CONFIRMED SUBMITTED: ${job.company}`);
      const vaultDir = path.resolve('screenshots/2026-10-19/shift1');
      if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });
      const proofPath = path.join(vaultDir, `ashby_${job.company.toLowerCase().replace(/[^a-z0-9]/g, '_')}_applied.png`);
      await page.screenshot({ path: proofPath, fullPage: true });

      // Update applied_todays
      const appliedPath = path.resolve('applied_todays_2026-10-19.json');
      const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
      appliedData.jobs.push({
        id: 'ashby_' + Date.now(),
        company: job.company,
        role: job.role,
        url: applyUrl,
        application_type: 'Direct ATS Portal (Ashby)',
        status: 'CONFIRMED_APPLIED',
        submitted_at: new Date().toISOString(),
        screenshot_proof: proofPath
      });
      appliedData.total = appliedData.jobs.length;
      fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2));

      await page.close();
      return { status: 'SUBMITTED' };
    } else {
      console.log(`⚠️ Unconfirmed submission for ${job.company} — Keeping open for human review.`);
      return { status: 'HELD_UNCONFIRMED', page, url: applyUrl, company: job.company };
    }
  } catch (err) {
    console.log(`Error running Ashby form for ${job.company}: ${err.message}`);
    await page.close();
    return { status: 'ERROR', error: err.message };
  }
}

async function main() {
  const verifiedList = JSON.parse(fs.readFileSync('verified_portal_jobs_clean.json', 'utf8'));
  const ashbyJobs = verifiedList.filter(j => (j.url || '').includes('ashbyhq.com'));
  console.log(`Total Ashby Jobs to process: ${ashbyJobs.length}`);

  // Test first 3 Ashby jobs
  for (let i = 0; i < Math.min(3, ashbyJobs.length); i++) {
    const res = await runAshbyPortal(ashbyJobs[i]);
    console.log(`Result for ${ashbyJobs[i].company}:`, res.status);
    if (res.status === 'HELD_FOR_CAPTCHA' || res.status === 'HELD_UNCONFIRMED') {
      console.log(`Tab kept open on screen for ${ashbyJobs[i].company}`);
      break;
    }
  }
}

main().catch(console.error);
