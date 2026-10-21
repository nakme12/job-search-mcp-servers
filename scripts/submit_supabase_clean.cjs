const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

async function submitSupabaseClean() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let sub = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase'));
  if (!sub) {
    sub = await browser.newPage();
  }

  const url = 'https://jobs.ashbyhq.com/supabase/e569b7f7-fa8f-4139-86f6-4f52b456882d/application';
  console.log('Navigating fresh to Supabase application...');
  await sub.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('1. Uploading Resume PDF...');
  const resumeInput = await sub.$('input[type="file"]#_systemfield_resume') || (await sub.$$('input[type="file"]'))[0];
  if (resumeInput) {
    await resumeInput.uploadFile(RESUME_PATH);
    console.log('Resume uploaded successfully!');
  }

  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Clean typing each input with Ctrl+A clear first...');
  async function clearAndType(selector, text) {
    const el = await sub.$(selector);
    if (el) {
      await el.click({ clickCount: 1 });
      await sub.keyboard.down('Control');
      await sub.keyboard.press('KeyA');
      await sub.keyboard.up('Control');
      await sub.keyboard.press('Backspace');
      await el.type(text, { delay: 25 });
    }
  }

  await clearAndType('input[name="_systemfield_name"]', PROFILE.name);
  await clearAndType('input[name="_systemfield_email"]', PROFILE.email);
  await clearAndType('input[name="b00d7771-a0bc-414c-9868-a565483ba454"]', 'India');
  await clearAndType('input[name="99930a87-5d77-4ae1-915f-653693ad3614"]', 'India');
  await clearAndType('input[name="a1a1ff15-2eef-4c24-b732-2938b7b11697"]', PROFILE.github);
  await clearAndType('input[name="e6fae51b-b49a-400b-a018-58fc83850182"]', PROFILE.linkedin);

  // Click radios via label text
  console.log('3. Clicking radio options...');
  const radioLabels = [
    'Linkedin',
    'Some exposure',
    'Both, strong in one',
    'Single-paradigm'
  ];

  await sub.evaluate((labels) => {
    labels.forEach(lblText => {
      const allLabels = Array.from(document.querySelectorAll('label'));
      const targetLabel = allLabels.find(l => l.innerText.toLowerCase().includes(lblText.toLowerCase()));
      if (targetLabel) targetLabel.click();
    });
  }, radioLabels);

  await new Promise(r => setTimeout(r, 1500));

  // Verify field values
  const verifiedValues = await sub.evaluate(() => {
    return {
      name: document.querySelector('input[name="_systemfield_name"]')?.value,
      email: document.querySelector('input[name="_systemfield_email"]')?.value,
      passport: document.querySelector('input[name="b00d7771-a0bc-414c-9868-a565483ba454"]')?.value,
      residence: document.querySelector('input[name="99930a87-5d77-4ae1-915f-653693ad3614"]')?.value
    };
  });
  console.log('Verified Form Values:', verifiedValues);

  console.log('4. Clicking Submit Application...');
  const submitBtn = await sub.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText.trim()));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Submit button clicked?', submitBtn);

  console.log('5. Waiting for live confirmation...');
  await new Promise(r => setTimeout(r, 6000));

  const text = await sub.evaluate(() => document.body ? document.body.innerText : '');
  const title = await sub.title();
  const currentUrl = sub.url();

  console.log('Title:', title);
  console.log('Current URL:', currentUrl);
  console.log('Text Snippet:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|received your application|success|we have received your application/i.test(text);

  if (isConfirmed) {
    console.log('🎉 100% CONFIRMED SUBMITTED: Supabase Software Engineer - Auth!');
    const vaultDir = path.resolve('screenshots/2026-10-19/shift1');
    if (!fs.existsSync(vaultDir)) fs.mkdirSync(vaultDir, { recursive: true });

    const proofPath = path.join(vaultDir, 'ashby_supabase_auth_applied.png');
    await sub.screenshot({ path: proofPath, fullPage: true });
    console.log(`Confirmation screenshot saved to ${proofPath}`);

    // Update applied_todays_2026-10-19.json
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

    console.log(`Successfully logged Supabase into applied_todays_2026-10-19.json! Total applied now: ${appliedData.total}`);

    console.log('Closing tab per Rule 57...');
    await sub.close();
    console.log('Tab closed successfully.');
  } else {
    console.log('⚠️ Not yet confirmed.');
  }
}

submitSupabaseClean().catch(console.error);
