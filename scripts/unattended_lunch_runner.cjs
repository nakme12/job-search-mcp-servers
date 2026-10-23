/**
 * CONTINUOUS UNATTENDED DIRECT CAREER & MULTI-PLATFORM RUNNER
 * (Rule 58 Lunch Mode: Zero Wait on Captcha, Instant Skip to Next, Physical Proof Asserted)
 */

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = {
  name: 'Pratik Patidar',
  firstName: 'Pratik',
  lastName: 'Patidar',
  email: 'pratikpatidar7990@gmail.com',
  phone: '+918269647990',
  phoneClean: '8269647990',
  linkedin: 'https://www.linkedin.com/in/pratik-patidar',
  portfolio: 'https://pratik-portfolio-nine-orcin.vercel.app',
  github: 'https://github.com/pratikpatidar7990',
  location: 'Indore, MP',
  relocation: 'Yes, ready to relocate immediately',
  currentCompany: 'IT Services Firm',
  currentRole: 'Frontend Developer',
  ctc: '2.16 LPA',
  ctcRaw: '216000',
  expectedCtc: '4.65 LPA',
  expectedCtcRaw: '465000',
  noticeDays: '15',
  experienceYears: '1.5',
  resumePath: 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf'
};

const TARGET_DIRECT_JOBS = [
  {
    company: "Air Apps",
    role: "Frontend Web Developer",
    url: "https://jobs.ashbyhq.com/airapps/94219e90-8787-47c6-9e12-c7bc18084d0c/application",
    type: "ashby"
  },
  {
    "company": "Allwyn Corp",
    "role": "Mid Level: Full-Stack Software Engineer",
    "url": "https://jobs.ashbyhq.com/allwyn-corp/e1f94ffc-13d7-4020-b074-41c87a193884/application",
    "type": "ashby"
  },
  {
    company: "Wellfound Job #2",
    role: "Frontend Developer (React.js & TypeScript)",
    url: "https://wellfound.com/jobs/4824611-frontend-developer-react-js-typescript-founding-team",
    type: "wellfound"
  },
  {
    company: "Wellfound Job #3",
    role: "Frontend Developer",
    url: "https://wellfound.com/jobs/4793783-frontend-developer",
    type: "wellfound"
  },
  {
    company: "Wellfound Job #4",
    role: "We're Hiring | Frontend Developer",
    url: "https://wellfound.com/jobs/4797050-we-re-hiring-frontend-developer",
    type: "wellfound"
  }
];

async function applyAshbyDirect(page, job) {
  console.log(`[Ashby] Applying to ${job.company}...`);
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2500));

  // Resume upload
  const fileInput = await page.$('input[type="file"]');
  if (fileInput && fs.existsSync(PROFILE.resumePath)) {
    await fileInput.uploadFile(PROFILE.resumePath);
    await new Promise(r => setTimeout(r, 2000));
  }

  // Physical CDP field typing
  const inputs = await page.$$('input[type="text"], input[type="email"], input[type="tel"]');
  for (let i = 0; i < inputs.length; i++) {
    const info = await inputs[i].evaluate(el => {
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

    if (combined.includes('name') && !combined.includes('company')) textToType = PROFILE.name;
    else if (combined.includes('email')) textToType = PROFILE.email;
    else if (combined.includes('phone') || combined.includes('mobile')) textToType = PROFILE.phone;
    else if (combined.includes('linkedin')) textToType = PROFILE.linkedin;
    else if (combined.includes('github') || combined.includes('portfolio') || combined.includes('website')) textToType = PROFILE.github;
    else if (combined.includes('location') || combined.includes('city')) textToType = PROFILE.location;
    else if (combined.includes('relocate')) textToType = PROFILE.relocation;
    else if (combined.includes('notice') || combined.includes('join')) textToType = PROFILE.noticeDays + ' Days';
    else if (combined.includes('ctc') || combined.includes('salary')) textToType = PROFILE.ctc;
    else if (combined.includes('experience')) textToType = PROFILE.experienceYears + ' Years';

    if (textToType) {
      await inputs[i].click({ clickCount: 3 });
      await page.keyboard.press('Backspace');
      await page.keyboard.type(textToType, { delay: 10 });
    }
  }

  // Radio / Yes-No options
  await page.evaluate(() => {
    const opts = Array.from(document.querySelectorAll('.ashby-application-form-input-yesno-option'));
    opts.forEach(o => {
      const pText = o.closest('div') ? o.closest('div').innerText.toLowerCase() : '';
      if (pText.includes('authorized') && o.innerText.trim().toLowerCase() === 'yes') o.click();
      else if (pText.includes('sponsorship') && o.innerText.trim().toLowerCase() === 'no') o.click();
      else if (o.innerText.trim().toLowerCase() === 'yes') o.click();
    });
    const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    cbs.forEach(cb => { if (!cb.checked) cb.click(); });
  });

  // Human mouse trajectory
  for (let m = 0; m < 15; m++) {
    const x = Math.floor(200 + Math.random() * 400);
    const y = Math.floor(200 + Math.random() * 300);
    await page.mouse.move(x, y, { steps: 2 });
    await new Promise(r => setTimeout(r, 25));
  }

  // Submit
  await page.evaluate(() => {
    const btn = document.querySelector('.ashby-application-form-submit-button');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 6000));

  const text = await page.evaluate(() => document.body ? document.body.innerText : '');
  return text.includes('successfully submitted') || text.includes('Thank you') || text.includes('Application submitted');
}

async function applyWellfoundJob(page, job) {
  console.log(`[Wellfound] Applying to ${job.url}...`);
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3000));

  // Check if Apply button exists
  const applyBtn = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Apply');
    if (btn) { btn.click(); return true; }
    return false;
  });

  if (!applyBtn) {
    console.log('[Wellfound] Apply button not available or already applied.');
    return false;
  }

  await new Promise(r => setTimeout(r, 2500));

  // Step 1: Click Continue on Profile Modal
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Continue');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Step 2: Pitch note
  const pitchText = `Hi Hiring Team,

I came across your opening for the Frontend Developer role and wanted to apply.

I have 1.5+ years of experience building modern web applications using React.js, TypeScript, Next.js, and REST APIs. I am based in Indore and ready to join immediately (15 days notice).

Looking forward to discussing further.

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com | +91 82696 47990`;

  const area = await page.$('textarea');
  if (area) {
    await area.focus();
    await page.keyboard.type(pitchText, { delay: 5 });
    await new Promise(r => setTimeout(r, 1000));
  }

  // Click Send application
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => {
      const t = b.innerText.toLowerCase();
      return t.includes('send application') || t.includes('submit');
    });
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 5000));

  const text = await page.evaluate(() => document.body ? document.body.innerText : '');
  return text.includes('Applied') || text.includes('Application sent') || text.includes('Your application was sent');
}

async function runUnattendedPipeline() {
  console.log('=== STARTING UNATTENDED LUNCH MODE PIPELINE ===');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();

  for (let i = 0; i < TARGET_DIRECT_JOBS.length; i++) {
    const job = TARGET_DIRECT_JOBS[i];
    console.log(`\n[${i + 1}/${TARGET_DIRECT_JOBS.length}] Processing: ${job.company} (${job.type})`);
    
    try {
      let success = false;
      if (job.type === 'ashby') {
        success = await applyAshbyDirect(page, job);
      } else if (job.type === 'wellfound') {
        success = await applyWellfoundJob(page, job);
      }

      console.log(`[${job.company}] Result: success=${success}`);
      const safeName = job.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const screenshotPath = `C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/${safeName}_confirmed.png`;
      fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
      await page.screenshot({ path: screenshotPath });

      if (success) {
        const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
        const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
        file5.jobs.push({
          company: job.company,
          role: job.role,
          url: job.url,
          channel: `${job.type.toUpperCase()} Unattended Apply`,
          proof_screenshot: screenshotPath,
          status: 'APPLIED_CONFIRMED',
          timestamp: new Date().toISOString()
        });
        file5.total = file5.jobs.length;
        fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');
        console.log(`🎉 [CONFIRMED] Total today: ${file5.total}`);
      }
    } catch (err) {
      console.error(`[${job.company}] Error: ${err.message}`);
    }
  }

  await page.close();
  await browser.disconnect();
  console.log('\n=== UNATTENDED BATCH FINISHED ===');
}

runUnattendedPipeline().catch(console.error);
