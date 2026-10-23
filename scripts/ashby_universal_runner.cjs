/**
 * UNIVERSAL ASHBY ATS RUNNER (REVERSE-ENGINEERED WITH MORLUTO/REA)
 * 
 * CORE FIX:
 * Uses physical CDP focus/click and keyboard.type() to satisfy Ashby's
 * React Fiber internal state & trusted event listeners.
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = {
  name: 'PRATIK PATIDAR',
  email: 'pratikpatidar7990@gmail.com',
  phone: '+918269647990',
  linkedin: 'https://www.linkedin.com/in/pratik-patidar',
  portfolio: 'https://pratik-portfolio-nine-orcin.vercel.app',
  github: 'https://github.com/pratikpatidar7990',
  location: 'Indore, MP',
  relocation: 'Yes, ready to relocate immediately',
  notice: '15 Days (or Immediate)',
  lastWorkingDay: 'October 2026',
  ctc: '2.16 LPA',
  experience: '1.5 Years',
  resumePath: 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - React Developer.pdf'
};

async function applyAshbyUniversal(job) {
  console.log(`\n======================================================`);
  console.log(`[Ashby Universal Engine] Starting application: ${job.company}`);
  console.log(`Role: ${job.role} | URL: ${job.url}`);
  console.log(`======================================================`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.bringToFront();

  const appUrl = job.url.endsWith('/application') ? job.url : job.url.replace(/\/$/, '') + '/application';
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2500));

  // 1. Upload Resume
  const fileInput = await page.$('input[type="file"]');
  if (fileInput && fs.existsSync(PROFILE.resumePath)) {
    console.log(`[${job.company}] Uploading authorized resume...`);
    await fileInput.uploadFile(PROFILE.resumePath);
    await new Promise(r => setTimeout(r, 2500));
  }

  // 2. Physical CDP Focus & Keyboard Type Loop for all Textareas & Inputs
  console.log(`[${job.company}] Filling fields via physical CDP focus & keyboard type...`);
  
  // Fill textareas first
  const textareas = await page.$$('textarea');
  for (const ta of textareas) {
    const isVisible = await ta.evaluate(el => el.offsetParent !== null);
    if (isVisible) {
      await ta.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.keyboard.type('Through GitHub developer community and open-source ecosystem', { delay: 10 });
    }
  }

  // Fill text / email / tel inputs
  const inputs = await page.$$('input[type="text"], input[type="email"], input[type="tel"]');
  for (let i = 0; i < inputs.length; i++) {
    const inp = inputs[i];
    const info = await inp.evaluate(el => {
      let cur = el;
      let label = '';
      for (let k = 0; k < 4; k++) {
        if (!cur) break;
        const l = cur.querySelector('label') || (cur.parentElement ? cur.parentElement.querySelector('label') : null);
        if (l) { label = l.innerText.toLowerCase(); break; }
        cur = cur.parentElement;
      }
      return {
        name: (el.name || el.id || '').toLowerCase(),
        val: el.value,
        label,
        visible: el.offsetParent !== null
      };
    });

    if (!info.visible) continue;

    const combined = (info.label + ' ' + info.name).toLowerCase();
    let textToType = '';

    if (combined.includes('name') && !combined.includes('company') && !combined.includes('previous')) {
      textToType = PROFILE.name;
    } else if (combined.includes('email')) {
      textToType = PROFILE.email;
    } else if (combined.includes('phone') || combined.includes('mobile')) {
      textToType = PROFILE.phone;
    } else if (combined.includes('linkedin')) {
      textToType = PROFILE.linkedin;
    } else if (combined.includes('github') || combined.includes('portfolio') || combined.includes('website') || combined.includes('work')) {
      textToType = PROFILE.github;
    } else if (combined.includes('location') || combined.includes('city') || combined.includes('residing')) {
      textToType = PROFILE.location;
    } else if (combined.includes('relocate') || combined.includes('relocation')) {
      textToType = PROFILE.relocation;
    } else if (combined.includes('join') || combined.includes('notice')) {
      textToType = PROFILE.notice;
    } else if (combined.includes('last working day')) {
      textToType = PROFILE.lastWorkingDay;
    } else if (combined.includes('ctc') || combined.includes('salary')) {
      textToType = PROFILE.ctc;
    } else if (combined.includes('experience') || combined.includes('years of')) {
      textToType = PROFILE.experience;
    } else if (combined.includes('company')) {
      textToType = 'IT Services Firm';
    } else if (combined.includes('title')) {
      textToType = 'Frontend Developer';
    }

    if (textToType) {
      console.log(`[${job.company}] Physical CDP typing "${textToType}" into field: ${info.label.substring(0, 40)}`);
      await inp.click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.keyboard.type(textToType, { delay: 10 });
      await page.keyboard.press('Tab');
      await new Promise(r => setTimeout(r, 50));
    }
  }

  // 3. Radio / Yes-No Options
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('.ashby-application-form-input-yesno-option'));
    opts.forEach(o => {
      const parent = o.closest('div[class*="input"]') || o.parentElement;
      const pText = parent ? parent.innerText.toLowerCase() : '';
      if (pText.includes('authorized') && o.innerText.trim().toLowerCase() === 'yes') o.click();
      else if (pText.includes('sponsorship') && o.innerText.trim().toLowerCase() === 'no') o.click();
      else if (o.innerText.trim().toLowerCase() === 'yes') o.click();
    });

    const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    cbs.forEach(cb => { if (!cb.checked) cb.click(); });
  });

  // 4. Natural Human Mouse Movement
  console.log(`[${job.company}] Simulating organic human mouse movement...`);
  for (let i = 0; i < 20; i++) {
    const x = Math.floor(150 + Math.random() * 500);
    const y = Math.floor(150 + Math.random() * 400);
    await page.mouse.move(x, y, { steps: 2 });
    await new Promise(r => setTimeout(r, 30));
  }

  // 5. Click Submit
  console.log(`[${job.company}] Clicking Submit Application...`);
  await page.evaluate(() => {
    const btn = document.querySelector('.ashby-application-form-submit-button');
    if (btn) {
      btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
      btn.click();
    }
  });

  // 6. Polling for Confirmation
  console.log(`[${job.company}] Waiting for live DOM submission confirmation...`);
  let isConfirmed = false;
  for (let w = 0; w < 10; w++) {
    await new Promise(r => setTimeout(r, 2000));
    isConfirmed = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      return text.includes('successfully submitted') ||
             text.includes('Thank you for applying') ||
             text.includes('Application submitted') ||
             text.includes('received your application');
    });
    if (isConfirmed) break;
  }

  console.log(`[${job.company}] Confirmation status:`, isConfirmed);

  const safeName = job.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
  const screenshotPath = `C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/${safeName}_ashby_confirmed.png`;
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log(`[${job.company}] Saved physical proof screenshot: ${screenshotPath}`);

  if (isConfirmed) {
    const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
    const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
    file5.jobs.push({
      company: job.company,
      role: job.role,
      url: job.url,
      channel: 'Ashby Direct ATS (Autonomous REA Engine)',
      proof_screenshot: screenshotPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    file5.total = file5.jobs.length;
    fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');

    // Remove from skipped list if present
    const skippedPath = 'C:/mcp/job-search-mcp-engine/data/daily/already_applied_or_skipped_todays_2026-10-23.json';
    if (fs.existsSync(skippedPath)) {
      let skipped = JSON.parse(fs.readFileSync(skippedPath, 'utf8'));
      skipped = skipped.filter(j => j.company !== job.company);
      fs.writeFileSync(skippedPath, JSON.stringify(skipped, null, 2), 'utf8');
    }

    console.log(`🎉 [SUCCESS] ${job.company} added to File 5! Total confirmed applications: ${file5.total}`);
    await page.close();
  } else {
    console.log(`⚠️ [WARNING] Live confirmation not detected for ${job.company}. Tab left open for inspection.`);
  }

  await browser.disconnect();
}

module.exports = { applyAshbyUniversal };
