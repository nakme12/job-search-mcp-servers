import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });

  // 1. Talent Zone Consultant
  const p1 = await browser.newPage();
  console.log('Opening Form 1: Talent Zone Consultant (React Developer)...');
  await p1.goto('https://www.placementindia.com/job-detail/react-developer-in-talent-zone-consultant-at-bangalore-1400223.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await p1.evaluate(() => {
    const btn = document.querySelector('a#applyJob, a.btn-dark');
    if (btn) btn.click();
  });

  // 2. Sanchit Life Insurance / Lavenya Creators
  const p2 = await browser.newPage();
  console.log('Opening Form 2: Sanchit Life Insurance (Junior Frontend Developer)...');
  await p2.goto('https://www.placementindia.com/job-detail/frontend-developer-in-lavenya-creators-at-delhi-1420904.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));
  await p2.evaluate(() => {
    const btn = document.querySelector('a#applyJob, a.btn-dark');
    if (btn) btn.click();
  });

  console.log('Chunk 3 both forms opened and active in Brave!');
  await browser.disconnect();
})();
