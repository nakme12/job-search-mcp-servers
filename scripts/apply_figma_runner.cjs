const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('figma'));
  if (!page) {
    console.error('Figma tab not found');
    return;
  }

  console.log('[Job 3/Batch] Figma — Inspecting and filling Greenhouse form...');

  // 1. Basic inputs
  const fieldMappings = [
    { sel: '#first_name, input[name*="first_name"]', val: PROFILE.first_name },
    { sel: '#last_name, input[name*="last_name"]', val: PROFILE.last_name },
    { sel: '#email, input[name*="email"]', val: PROFILE.email },
    { sel: '#phone, input[name*="phone"]', val: PROFILE.phone_raw }
  ];

  for (const f of fieldMappings) {
    const el = await page.$(f.sel);
    if (el) {
      await el.click({ clickCount: 3 });
      await el.type(f.val, { delay: 15 });
    }
  }

  // 2. Attach resume
  console.log(`[Job 3/Batch] Figma — Uploading resume: ${path.basename(RESUME_PATH)}`);
  const fileInput = await page.$('input[type="file"]');
  if (fileInput) {
    await fileInput.uploadFile(RESUME_PATH);
    await sleep(2500);
  }

  // 3. Socials
  await page.evaluate((prof) => {
    function setVal(inp, val) {
      if (!inp) return;
      inp.value = val;
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const allInputs = Array.from(document.querySelectorAll('input, select, textarea'));
    allInputs.forEach(inp => {
      const label = (inp.getAttribute('aria-label') || (inp.labels && inp.labels[0] ? inp.labels[0].innerText : '') || inp.placeholder || inp.id || '').toLowerCase();

      if (label.includes('linkedin')) setVal(inp, prof.linkedin);
      else if (label.includes('website') || label.includes('portfolio')) setVal(inp, prof.portfolio);
      else if (label.includes('github')) setVal(inp, prof.github);
      else if (label.includes('years of professional experience') || label.includes('how many years')) setVal(inp, '1.5');
      else if (label.includes('preferred first name')) setVal(inp, prof.first_name);
    });
  }, PROFILE);

  console.log('[Job 3/Batch] Figma — Fields populated.');
  await page.bringToFront();
}

main().catch(console.error);
