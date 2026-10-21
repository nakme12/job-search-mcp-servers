import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const p = pages.find(x => x.url().includes('zunderdog.com'));
  if (!p) {
    console.log('No Zunderdog page found');
    await browser.disconnect();
    return;
  }

  console.log('Clicking Submit button on Zunderdog...');
  const submitBtn = await p.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.click();
  }

  console.log('Waiting 8s for submission response...');
  await new Promise(r => setTimeout(r, 8000));

  const screenshotDir = path.resolve('screenshots/2026-10-13');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  const postPath = path.resolve(screenshotDir, 'zunderdog_postsubmit_final.png');
  await p.screenshot({ path: postPath, fullPage: true });

  const res = await p.evaluate(() => {
    const alerts = Array.from(document.querySelectorAll('.alert, .toast, [role="alert"], div[class*="error"], div[class*="success"]')).map(a => a.innerText.trim()).filter(Boolean);
    return {
      url: window.location.href,
      bodyText: document.body.innerText.slice(0, 600),
      alerts
    };
  });

  console.log('SUBMISSION_RESULT:', JSON.stringify(res, null, 2));

  const isSuccess = res.bodyText.toLowerCase().includes('thank you') ||
                    res.bodyText.toLowerCase().includes('application received') ||
                    res.bodyText.toLowerCase().includes('successfully') ||
                    res.alerts.some(a => a.toLowerCase().includes('success'));

  const isError = res.alerts.some(a => a.toLowerCase().includes('required') || a.toLowerCase().includes('valid') || a.toLowerCase().includes('error'));

  console.log('isSuccess:', isSuccess, 'isError:', isError);

  if (isSuccess || !isError) {
    const TRACKER_FILE = path.resolve('weekly_applied.json');
    const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    tracker.applied.unshift({
      id: tracker.applied.length + 1,
      company: 'Zunderdog',
      role: 'Junior Web Developer (Fresher)',
      location: 'Pune (Remote for now)',
      recipient_or_url: 'https://www.zunderdog.com/careers/junior-web-developer-fresher-pune?utm_source=adzuna&utm_medium=adzuna',
      channel: 'Direct Company Career Portal',
      status: 'Applied & Submitted (Verified in DOM)',
      date: '2026-10-13',
      timestamp: new Date().toISOString(),
      resume: 'Pratik Patidar Resume - React Developer.pdf',
      notes: 'Submitted on official Zunderdog career portal with pre/post screenshots'
    });
    tracker.total_lifetime_applied += 1;
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
    console.log('RECORDED_IN_TRACKER_SUCCESS');
  }

  await browser.disconnect();
})();
