const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applyWellfoundBhumio() {
  console.log('[Wellfound] Connecting to browser...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const jobUrl = 'https://wellfound.com/jobs/3833952-front-end-developer-reactjs';
  
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));

  console.log('[Wellfound] Clicking Apply button...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Apply');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Step 1: Click "Continue" on profile review modal
  console.log('[Wellfound] Step 1: Clicking Continue on profile confirmation...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Continue');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 3000));

  // Step 2: Check for pitch / cover note or questions
  console.log('[Wellfound] Step 2: Inspecting note / submit modal...');
  const pitchText = `Hi Bhumio Hiring Team,

I came across your opening for the Front-End Developer (ReactJS) role and wanted to apply.

I have 1.5+ years of experience building modern web applications using React.js, TypeScript, Next.js, and REST APIs. I am based in Indore and ready to contribute immediately.

Looking forward to discussing the opportunity further.

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com | +91 82696 47990`;

  // Type pitch if textarea present
  const area = await page.$('textarea');
  if (area) {
    console.log('[Wellfound] Pitch textarea detected, typing message...');
    await area.focus();
    await page.keyboard.type(pitchText, { delay: 5 });
    await new Promise(r => setTimeout(r, 1000));
  }

  // Click Send application / Submit
  console.log('[Wellfound] Clicking Send Application...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => {
      const t = b.innerText.toLowerCase();
      return t.includes('send application') || t.includes('submit') || t.includes('apply');
    });
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 5000));

  // Assert confirmation
  const isConfirmed = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    return text.includes('Applied') ||
           text.includes('Application sent') ||
           text.includes('Your application was sent');
  });

  console.log('[Wellfound] isConfirmed:', isConfirmed);

  const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/bhumio_wellfound_confirmed.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log('[Wellfound] Saved proof screenshot:', screenshotPath);

  if (isConfirmed) {
    const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
    const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
    file5.jobs.push({
      company: 'Bhumio',
      role: 'Front-End Developer (ReactJS)',
      url: jobUrl,
      channel: 'Wellfound 1-Click Platform Apply (Candidate #11 Confirmed)',
      proof_screenshot: screenshotPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    file5.total = file5.jobs.length;
    fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');

    console.log('[Wellfound] BHUMIO APPLIED SUCCESSFULLY! Total today:', file5.total);
    await page.close();
  }

  await browser.disconnect();
}

applyWellfoundBhumio().catch(console.error);
