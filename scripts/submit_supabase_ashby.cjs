const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

async function submitSupabase() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const url = 'https://jobs.ashbyhq.com/supabase/e569b7f7-fa8f-4139-86f6-4f52b456882d/application';

  console.log('Navigating to Supabase application:', url);
  const page = await browser.newPage();
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('1. Uploading resume...');
  const resumeInput = await page.$('input[type="file"]#_systemfield_resume') || (await page.$$('input[type="file"]'))[0];
  if (resumeInput) {
    await resumeInput.uploadFile(RESUME_PATH);
    console.log('Resume uploaded successfully!');
  }

  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Populating fields via React 18 prototype setters...');
  await page.evaluate((prof) => {
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

    function setReactVal(el, val) {
      if (!el) return;
      if (el.tagName === 'TEXTAREA') textareaSetter.call(el, val);
      else inputSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    setReactVal(document.querySelector('input[name="_systemfield_name"]'), prof.name);
    setReactVal(document.querySelector('input[name="_systemfield_email"]'), prof.email);
    setReactVal(document.querySelector('input[name="b00d7771-a0bc-414c-9868-a565483ba454"]'), 'India');
    setReactVal(document.querySelector('input[name="99930a87-5d77-4ae1-915f-653693ad3614"]'), 'India');
    setReactVal(document.querySelector('input[name="a1a1ff15-2eef-4c24-b732-2938b7b11697"]'), prof.github);
    setReactVal(document.querySelector('input[name="e6fae51b-b49a-400b-a018-58fc83850182"]'), prof.linkedin);
    setReactVal(document.querySelector('textarea[name="44e44028-15ff-4e27-bf0c-3109b0c1b832"]'), 'Contributed to open source full-stack web applications and modern React component libraries.');

    // Select standard radio answers
    function checkRadio(id) {
      const el = document.getElementById(id);
      if (el) {
        el.click();
        el.checked = true;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    checkRadio('2da75501-0c7d-4c77-b10c-01a8097abc7c_bdd51f88-aa8e-4a57-b0b2-1f3f2b81ea51-labeled-radio-1'); // Linkedin
    checkRadio('2da75501-0c7d-4c77-b10c-01a8097abc7c_8ec862ce-d517-45c5-b5c5-bacd2b6523ff-labeled-radio-1'); // Some exposure auth
    checkRadio('2da75501-0c7d-4c77-b10c-01a8097abc7c_e2fc90ad-65b2-407b-8b60-b13b8bffd8a3-labeled-radio-3'); // Both, strong in TS
    checkRadio('2da75501-0c7d-4c77-b10c-01a8097abc7c_8dca36d0-2b14-40ac-9b06-ebf32e5e55e5-labeled-radio-1'); // Next.js SSR
  }, PROFILE);

  await new Promise(r => setTimeout(r, 2000));

  console.log('3. Clicking Submit Application...');
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

  const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
  const pageTitle = await page.title();
  console.log('Page Title:', pageTitle);
  console.log('Text Snippet:\n', pageText.slice(0, 400));

  const isConfirmed = /thank you|application submitted|received your application|success/i.test(pageText) || /thank you/i.test(pageTitle);

  if (isConfirmed) {
    console.log('🎉 CONFIRMED SUBMITTED: Supabase Software Engineer - Auth!');
    const vaultDir = path.resolve('screenshots/2026-10-19/shift1');
    if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });
    const proofPath = path.join(vaultDir, 'ashby_supabase_auth_applied.png');
    await page.screenshot({ path: proofPath, fullPage: true });

    const appliedPath = path.resolve('applied_todays_2026-10-19.json');
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      id: 'ashby_supabase_' + Date.now(),
      company: 'Supabase',
      role: 'Software Engineer - Auth',
      location: 'Remote, Global',
      application_type: 'Direct ATS Portal (Ashby)',
      url: url,
      status: 'CONFIRMED_APPLIED',
      submitted_at: new Date().toISOString(),
      screenshot_proof: proofPath
    });
    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2));

    console.log(`Updated applied_todays_2026-10-19.json! Total applied now: ${appliedData.total}`);
    await page.close();
  } else {
    console.log('Submission pending or validation required. Keeping tab open.');
  }
}

submitSupabase().catch(console.error);
