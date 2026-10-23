const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PITCH_TEXT = `Hi Arivihan Technologies Hiring Team,

I came across your opening for the React Developer role based here in Indore and wanted to apply.

I am a Full Stack / Frontend Developer based locally in Indore with 1.5+ years of experience building scalable web applications using React.js, TypeScript, Next.js, and modern REST APIs.

Since I am already based in Indore, I can join your office immediately (15 days notice).

Looking forward to discussing the role further.

Thanks & Regards,
Pratik Patidar
pratikpatidar7990@gmail.com | +91 82696 47990
Indore, MP`;

async function applyArivihan() {
  console.log('[Indore Local Direct] Connecting to browser...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const jobUrl = 'https://wellfound.com/jobs/4574512-react-developer';

  await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));

  console.log('[Indore Local Direct] Clicking Apply button...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Apply');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Step 1: Click Continue on profile review
  console.log('[Indore Local Direct] Step 1: Clicking Continue...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Continue');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  // Step 2: Pitch note
  console.log('[Indore Local Direct] Step 2: Typing local Indore pitch note...');
  const area = await page.$('textarea');
  if (area) {
    await area.focus();
    await page.keyboard.type(PITCH_TEXT, { delay: 5 });
    await new Promise(r => setTimeout(r, 1000));
  }

  // Step 3: Send Application
  console.log('[Indore Local Direct] Step 3: Clicking Send application...');
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => {
      const t = b.innerText.toLowerCase();
      return t.includes('send application') || t.includes('submit');
    });
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 5000));

  const text = await page.evaluate(() => document.body ? document.body.innerText : '');
  const isConfirmed = text.includes('Applied') || text.includes('Application sent') || text.includes('Your application was sent');
  console.log('[Indore Local Direct] isConfirmed:', isConfirmed);

  const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/arivihan_technologies_wellfound_confirmed.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log('[Indore Local Direct] Saved proof screenshot:', screenshotPath);

  if (isConfirmed) {
    const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
    const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
    file5.jobs.push({
      company: 'Arivihan Technologies',
      role: 'React Developer (Indore Local)',
      url: jobUrl,
      channel: 'Wellfound Platform Direct Apply (Candidate #21 Confirmed)',
      proof_screenshot: screenshotPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    file5.total = file5.jobs.length;
    fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');

    console.log('[Indore Local Direct] ARIVIHAN TECHNOLOGIES CONFIRMED APPLIED! Total today:', file5.total);
    await page.close();
  }

  await browser.disconnect();
}

applyArivihan().catch(console.error);
