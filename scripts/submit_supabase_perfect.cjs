const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

async function submitSupabase() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase'));
  if (!page) {
    page = await browser.newPage();
  }

  const url = 'https://jobs.ashbyhq.com/supabase/e569b7f7-fa8f-4139-86f6-4f52b456882d/application';
  console.log('Navigating to Supabase application...');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('1. Uploading Resume PDF...');
  const resumeInput = await page.$('input[type="file"]#_systemfield_resume') || (await page.$$('input[type="file"]'))[0];
  if (resumeInput) {
    await resumeInput.uploadFile(RESUME_PATH);
    console.log('Resume PDF uploaded.');
  }

  await new Promise(r => setTimeout(r, 1500));

  console.log('2. Populating all inputs synchronously with React 18 Prototype Setter...');
  const fillSummary = await page.evaluate((prof) => {
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

    function setVal(el, val) {
      if (!el) return;
      if (el.tagName === 'TEXTAREA') textareaSetter.call(el, val);
      else inputSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Name & Email
    const nameInput = document.querySelector('input[name="_systemfield_name"]');
    const emailInput = document.querySelector('input[name="_systemfield_email"]');
    setVal(nameInput, prof.name);
    setVal(emailInput, prof.email);

    // Dynamic inputs by label
    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"], textarea'));
    const filled = [];
    for (const inp of allInputs) {
      const lbl = (inp.getAttribute('aria-label') || (inp.labels && inp.labels[0] ? inp.labels[0].innerText : '') || inp.placeholder || inp.name || '').toLowerCase();
      if (lbl.includes('passport')) {
        setVal(inp, 'India');
        filled.push('passport');
      } else if (lbl.includes('residence')) {
        setVal(inp, 'India');
        filled.push('residence');
      } else if (lbl.includes('github')) {
        setVal(inp, prof.github);
        filled.push('github');
      } else if (lbl.includes('linkedin')) {
        setVal(inp, prof.linkedin);
        filled.push('linkedin');
      } else if (lbl.includes('open source') || lbl.includes('contributions')) {
        setVal(inp, 'Contributed to open source full-stack web applications and React component libraries.');
        filled.push('open_source');
      }
    }

    // Radio options
    const radioLabels = [
      'Linkedin',
      'Some exposure',
      'Both, strong in one',
      'Single-paradigm'
    ];
    const clickedRadios = [];
    radioLabels.forEach(lblText => {
      const allLabels = Array.from(document.querySelectorAll('label'));
      const target = allLabels.find(l => l.innerText.toLowerCase().includes(lblText.toLowerCase()));
      if (target) {
        target.click();
        clickedRadios.push(lblText);
      }
    });

    return {
      name: nameInput ? nameInput.value : 'missing',
      email: emailInput ? emailInput.value : 'missing',
      filled,
      clickedRadios
    };
  }, PROFILE);

  console.log('Fill Summary:', JSON.stringify(fillSummary, null, 2));

  await new Promise(r => setTimeout(r, 2000));

  console.log('3. Clicking Submit Application button...');
  const submitted = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText.trim()));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Submit button clicked?', submitted);

  console.log('4. Waiting 6s for live confirmation screen...');
  await new Promise(r => setTimeout(r, 6000));

  const text = await page.evaluate(() => document.body ? document.body.innerText : '');
  const title = await page.title();
  const currentUrl = page.url();

  console.log('Page Title:', title);
  console.log('Current URL:', currentUrl);
  console.log('Snippet:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|received your application|success|we have received your application/i.test(text) || /thank you/i.test(title);

  if (isConfirmed) {
    console.log('🎉 100% CONFIRMED SUBMISSION DETECTED FOR SUPABASE!');
    const vaultDir = path.resolve('screenshots/2026-10-19/shift1');
    if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });

    const proofPath = path.join(vaultDir, 'ashby_supabase_auth_applied.png');
    await page.screenshot({ path: proofPath, fullPage: true });
    console.log(`Proof saved to: ${proofPath}`);

    const appliedPath = path.resolve('applied_todays_2026-10-19.json');
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));

    appliedData.jobs.push({
      id: 'ashby_supabase_' + Date.now(),
      company: 'Supabase',
      role: 'Software Engineer - Auth',
      location: 'Remote, Global',
      application_type: 'Direct ATS Portal (Ashby)',
      url: currentUrl,
      status: 'CONFIRMED_APPLIED',
      submitted_at: new Date().toISOString(),
      screenshot_proof: proofPath
    });
    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2));

    console.log(`Updated applied_todays_2026-10-19.json! Total applied now: ${appliedData.total}`);
    await page.close();
    console.log('Tab closed per Rule 57.');
  } else {
    console.log('⚠️ Not yet confirmed.');
    const errorMessages = await page.evaluate(() => {
      const errs = Array.from(document.querySelectorAll('.error, [aria-invalid="true"]')).map(e => e.innerText.trim());
      return Array.from(new Set(errs));
    });
    console.log('Remaining errors if any:', errorMessages);
  }
}

submitSupabase().catch(console.error);
