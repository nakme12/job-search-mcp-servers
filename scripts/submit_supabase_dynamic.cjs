const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

async function submitDynamic() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase'));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://jobs.ashbyhq.com/supabase/e569b7f7-fa8f-4139-86f6-4f52b456882d/application', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));
  }

  console.log('1. Uploading Resume PDF...');
  const fileInputs = await page.$$('input[type="file"]');
  for (const fi of fileInputs) {
    try {
      await fi.uploadFile(RESUME_PATH);
      console.log('Attached file to input.');
    } catch (e) {}
  }

  await new Promise(r => setTimeout(r, 1500));

  console.log('2. Dynamically mapping and typing inputs by Label...');
  const fieldMapping = [
    { match: 'name', val: PROFILE.name },
    { match: 'email', val: PROFILE.email },
    { match: 'passport', val: 'India' },
    { match: 'residence', val: 'India' },
    { match: 'github', val: PROFILE.github },
    { match: 'linkedin', val: PROFILE.linkedin }
  ];

  for (const item of fieldMapping) {
    const selector = await page.evaluateHandle((m) => {
      const inputs = Array.from(document.querySelectorAll('input[type="text"], input[type="email"]'));
      return inputs.find(inp => {
        const lbl = (inp.getAttribute('aria-label') || (inp.labels && inp.labels[0] ? inp.labels[0].innerText : '') || inp.placeholder || inp.name || '').toLowerCase();
        return lbl.includes(m);
      });
    }, item.match);

    const el = selector.asElement();
    if (el) {
      console.log(`Typing for match: [${item.match}] -> ${item.val}`);
      await el.click({ clickCount: 1 });
      await page.keyboard.down('Control');
      await page.keyboard.press('KeyA');
      await page.keyboard.up('Control');
      await page.keyboard.press('Backspace');
      await el.type(item.val, { delay: 20 });
    } else {
      console.log(`Could not find element for [${item.match}]`);
    }
  }

  console.log('3. Clicking radio options...');
  const radioLabels = [
    'Linkedin',
    'Some exposure',
    'Both, strong in one',
    'Single-paradigm'
  ];

  await page.evaluate((labels) => {
    labels.forEach(lblText => {
      const allLabels = Array.from(document.querySelectorAll('label'));
      const target = allLabels.find(l => l.innerText.toLowerCase().includes(lblText.toLowerCase()));
      if (target) target.click();
    });
  }, radioLabels);

  await new Promise(r => setTimeout(r, 1500));

  console.log('4. Checking Form Errors before Submit:');
  const errorsBefore = await page.evaluate(() => {
    const errs = Array.from(document.querySelectorAll('.error, [aria-invalid="true"]')).map(e => e.innerText.trim());
    return Array.from(new Set(errs));
  });
  console.log('Errors before submit:', errorsBefore);

  console.log('5. Clicking Submit Application button...');
  const submitted = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText.trim()));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Submit button clicked?', submitted);

  console.log('6. Waiting 6s for live confirmation screen...');
  await new Promise(r => setTimeout(r, 6000));

  const text = await page.evaluate(() => document.body ? document.body.innerText : '');
  const title = await page.title();
  const currentUrl = page.url();

  console.log('Title:', title);
  console.log('URL:', currentUrl);
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
  }
}

submitDynamic().catch(console.error);
