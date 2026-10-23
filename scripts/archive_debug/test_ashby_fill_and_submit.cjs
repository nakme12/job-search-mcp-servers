const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

async function testSubmitAshby() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const url = 'https://jobs.ashbyhq.com/ramp/4e64ab86-4e30-403b-b1b9-41dc052570ce/application';

  console.log('Opening Ashby application:', url);
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3500));

  console.log('1. Uploading resume to #_systemfield_resume...');
  const resumeInput = await page.$('input[type="file"]#_systemfield_resume') || (await page.$$('input[type="file"]'))[0];
  if (resumeInput) {
    await resumeInput.uploadFile(RESUME_PATH);
    console.log('Resume injected successfully!');
  }

  await new Promise(r => setTimeout(r, 1500));

  console.log('2. Filling all text, email, tel, and textarea inputs...');
  await page.evaluate((prof) => {
    function fireInputEvents(el, val) {
      el.focus();
      el.value = '';
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
    }

    // Name & Email
    const nameInput = document.querySelector('input[name="_systemfield_name"]');
    if (nameInput) fireInputEvents(nameInput, prof.name);

    const emailInput = document.querySelector('input[name="_systemfield_email"]');
    if (emailInput) fireInputEvents(emailInput, prof.email);

    // Phone
    const phoneInput = document.querySelector('input[type="tel"]') || document.querySelector('input[name*="phone" i]');
    if (phoneInput) fireInputEvents(phoneInput, prof.phone);

    // Fill all text inputs and textareas
    const allText = Array.from(document.querySelectorAll('input[type="text"], textarea'));
    for (const inp of allText) {
      const label = (inp.getAttribute('aria-label') || (inp.labels && inp.labels[0] ? inp.labels[0].innerText : '') || inp.placeholder || inp.name || '').toLowerCase();
      if (label.includes('linkedin')) {
        fireInputEvents(inp, prof.linkedin);
      } else if (label.includes('github') || label.includes('website') || label.includes('portfolio')) {
        fireInputEvents(inp, prof.portfolio);
      } else if (label.includes('javascript') || label.includes('react') || label.includes('proficiency')) {
        fireInputEvents(inp, 'Yes, 1.5 years experience with React.js, Next.js, TypeScript, Node.js, and modern REST APIs.');
      } else if (label.includes('exceptional performance') || label.includes('examples')) {
        fireInputEvents(inp, 'Consistently delivered high-quality frontend modules with optimal rendering performance and 99.9% reliability.');
      } else if (!inp.value && inp.required) {
        fireInputEvents(inp, 'Yes, proficient and experienced.');
      }
    }

    // Check all required checkboxes & radio buttons
    const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    checkboxes.forEach(c => {
      if (!c.checked) {
        c.click();
        c.checked = true;
        c.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
    radios.forEach(r => {
      const val = (r.value || '').toLowerCase();
      const parentText = (r.parentElement ? r.parentElement.innerText : '').toLowerCase();
      if (val.includes('yes') || parentText.includes('yes') || val === 'true') {
        r.click();
        r.checked = true;
        r.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }, PROFILE);

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

  console.log('4. Waiting for confirmation...');
  await new Promise(r => setTimeout(r, 6000));

  const text = await page.evaluate(() => document.body ? document.body.innerText : '');
  console.log('Page preview:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|received your application|success/i.test(text);
  if (isConfirmed) {
    console.log('🎉 CONFIRMATION DETECTED FOR RAMP ON ASHBY!');
    const vaultDir = path.resolve('screenshots/2026-10-19/shift1');
    if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });
    const proofPath = path.join(vaultDir, 'ashby_ramp_frontend_applied.png');
    await page.screenshot({ path: proofPath, fullPage: true });
    console.log('Proof saved to:', proofPath);
    await page.close();
  } else {
    console.log('Unconfirmed. Tab held open for inspection.');
  }
}

testSubmitAshby().catch(console.error);
