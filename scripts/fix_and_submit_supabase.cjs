const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function fixAndSubmitSupabase() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const sub = pages.find(p => p.url().includes('jobs.ashbyhq.com/supabase'));
  if (!sub) {
    console.log('Supabase tab not found');
    return;
  }

  console.log('1. Correcting Email and Name per Rule 70...');
  // Use select all (Ctrl+A / triple click) + Backspace + type
  const emailInput = await sub.$('input[name="_systemfield_email"]');
  if (emailInput) {
    await emailInput.click({ clickCount: 3 });
    await sub.keyboard.press('Backspace');
    await emailInput.type('pratikpatidar7990@gmail.com', { delay: 20 });
  }

  const nameInput = await sub.$('input[name="_systemfield_name"]');
  if (nameInput) {
    await nameInput.click({ clickCount: 3 });
    await sub.keyboard.press('Backspace');
    await nameInput.type('Pratik Patidar', { delay: 20 });
  }

  const passInput = await sub.$('input[name="b00d7771-a0bc-414c-9868-a565483ba454"]');
  if (passInput) {
    await passInput.click({ clickCount: 3 });
    await sub.keyboard.press('Backspace');
    await passInput.type('India', { delay: 20 });
  }

  const resInput = await sub.$('input[name="99930a87-5d77-4ae1-915f-653693ad3614"]');
  if (resInput) {
    await resInput.click({ clickCount: 3 });
    await sub.keyboard.press('Backspace');
    await resInput.type('India', { delay: 20 });
  }

  await new Promise(r => setTimeout(r, 1000));

  const values = await sub.evaluate(() => {
    return {
      name: document.querySelector('input[name="_systemfield_name"]')?.value,
      email: document.querySelector('input[name="_systemfield_email"]')?.value,
      passport: document.querySelector('input[name="b00d7771-a0bc-414c-9868-a565483ba454"]')?.value,
      residence: document.querySelector('input[name="99930a87-5d77-4ae1-915f-653693ad3614"]')?.value
    };
  });
  console.log('Cleaned Values:', values);

  console.log('2. Clicking Submit Application button...');
  const submitBtn = await sub.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText.trim()));
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Submit button clicked?', submitBtn);

  console.log('3. Waiting for confirmation screen...');
  await new Promise(r => setTimeout(r, 6000));

  const text = await sub.evaluate(() => document.body ? document.body.innerText : '');
  const title = await sub.title();
  const url = sub.url();

  console.log('Title:', title);
  console.log('URL:', url);
  console.log('Text Snippet:\n', text.slice(0, 400));

  const isConfirmed = /thank you|application submitted|received your application|success|we have received your application/i.test(text);

  if (isConfirmed) {
    console.log('🎉 CONFIRMED APPLICATION SUBMITTED FOR SUPABASE!');
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
      url: url,
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
    console.log('⚠️ Submission not confirmed yet.');
  }
}

fixAndSubmitSupabase().catch(console.error);
