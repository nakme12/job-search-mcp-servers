import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://in.linkedin.com/jobs/view/junior-frontend-developer-at-redsag-4477269828?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic', { waitUntil: 'networkidle2', timeout: 30000 });
    const applyTarget = await p.evaluate(() => {
      const applyBtn = Array.from(document.querySelectorAll('a, button')).find(el => (el.innerText || '').toLowerCase().includes('apply now') || (el.innerText || '').toLowerCase().includes('apply'));
      return {
        tag: applyBtn ? applyBtn.tagName : null,
        text: applyBtn ? applyBtn.innerText : null,
        href: applyBtn ? applyBtn.href || applyBtn.getAttribute('href') : null
      };
    });
    console.log('Redsag apply target:', applyTarget);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
