import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Navigating to Redsag LinkedIn job posting...');
    await p.goto('https://in.linkedin.com/jobs/view/junior-frontend-developer-at-redsag-4477269828?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const info = await p.evaluate(() => {
      const easyApply = document.querySelector('.jobs-apply-button, .jobs-s-apply, button[aria-label*="Easy Apply"]');
      const applyBtn = document.querySelector('a[href*="apply"], button[data-control-name*="apply"]');
      return {
        title: document.title,
        easyApply: !!easyApply,
        hasApply: !!applyBtn,
        applyText: applyBtn ? applyBtn.innerText : null,
        bodySnippet: document.body.innerText.slice(0, 400)
      };
    });
    console.log('Redsag info:', info);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
