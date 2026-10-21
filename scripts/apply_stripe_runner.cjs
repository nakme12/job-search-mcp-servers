const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('job-boards.greenhouse.io/embed/job_app?for=stripe'));
  if (!page) {
    console.error('Stripe embed page not found');
    return;
  }

  console.log('[Job 4/Batch] Stripe Bengaluru Intern — Filling Greenhouse Form...');

  // 1. Basic text fields
  const fieldMappings = [
    { sel: '#first_name', val: PROFILE.first_name },
    { sel: '#last_name', val: PROFILE.last_name },
    { sel: '#email', val: PROFILE.email },
    { sel: '#phone', val: PROFILE.phone_raw }
  ];

  for (const f of fieldMappings) {
    const el = await page.$(f.sel);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(f.val, { delay: 15 });
    }
  }

  // 2. Resume upload
  console.log('[Job 4/Batch] Stripe — Uploading resume:', path.basename(RESUME_PATH));
  const fileInputs = await page.$$('input[type="file"]');
  if (fileInputs.length > 0) {
    await fileInputs[0].uploadFile(RESUME_PATH);
    await sleep(2500);
  }

  // 3. Location, Education, Socials
  await page.evaluate((prof) => {
    function setVal(el, val) {
      if (!el) return;
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Location city
    const locInp = document.querySelector('input[id*="location" i], input[name*="location" i]');
    if (locInp) setVal(locInp, 'Bengaluru, Karnataka, India');

    // Start / End year
    const startYr = document.querySelector('#start-year--0, input[id*="start-year"]');
    if (startYr) setVal(startYr, '2020');

    const endYr = document.querySelector('#end-year--0, input[id*="end-year"]');
    if (endYr) setVal(endYr, '2024');

    // GPA & School
    const schoolOther = document.querySelector('input[id="question_67942582"]');
    if (schoolOther) setVal(schoolOther, 'Barkatullah University Institute of Technology (BUIT), Bhopal');

    const gpa = document.querySelector('input[id="question_67942583"]');
    if (gpa) setVal(gpa, '7.89 CGPA');

    // All dynamic inputs
    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"], textarea'));
    allInputs.forEach(inp => {
      const label = (inp.getAttribute('aria-label') || (inp.labels && inp.labels[0] ? inp.labels[0].innerText : '') || inp.placeholder || inp.id || '').toLowerCase();
      if (label.includes('linkedin')) {
        setVal(inp, prof.linkedin);
      } else if (label.includes('github') || label.includes('personal') || label.includes('website')) {
        setVal(inp, prof.portfolio);
      }
    });
  }, PROFILE);

  console.log('[Job 4/Batch] Stripe — Basic fields and education mapped.');
  await page.bringToFront();
}

main().catch(console.error);
