import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('mail.google.com'));

  if (!page) {
    console.log('Gmail tab not found!');
    return;
  }

  await page.bringToFront();
  console.log('Clicking Send on Anuyog draft...');

  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('div[role="button"]'));
    const sendBtn = btns.find(b => (b.innerText || '').trim() === 'Send' || b.getAttribute('data-tooltip')?.includes('Send'));
    if (sendBtn) {
      sendBtn.click();
      return 'Clicked Send';
    }
    return 'Send button not found';
  });

  console.log('Result:', clicked);
  await new Promise(r => setTimeout(r, 4000));

  // Navigate to #sent to physically verify (Rule 19)
  await page.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));

  await page.screenshot({ path: 'screenshots/2026-10-13/anuyog_sent_folder_verified.png' });
  console.log('Saved sent folder verification screenshot.');

  // Check top row in sent folder
  const sentCheck = await page.evaluate(() => {
    const topRow = document.querySelector('tr[role="row"]');
    return topRow ? topRow.innerText.slice(0, 300) : 'No row found';
  });
  console.log('Top Sent row:', sentCheck);

  // Update Tracker
  if (sentCheck.toLowerCase().includes('contact') || sentCheck.toLowerCase().includes('anuyog')) {
    const trackerPath = 'applied_and_seen_tracker.json';
    const tracker = JSON.parse(fs.readFileSync(trackerPath, 'utf8'));
    if (!tracker.applied) tracker.applied = [];

    tracker.applied.push({
      company: 'Anuyog Softwares',
      role: 'Software Development Engineer I',
      location: 'Indore',
      portal: 'Direct Recruiter Email',
      recipient: 'contact@anuyogsoftwares.com',
      url: 'https://anuyogsoftwares.com/careers/JD-2026-021#apply',
      applied_at: new Date().toISOString(),
      status: 'applied',
      mode: 'direct_email'
    });

    fs.writeFileSync(trackerPath, JSON.stringify(tracker, null, 2), 'utf8');
    console.log('Tracker updated with Anuyog Softwares! Total applied:', tracker.applied.length);
  }

})();
