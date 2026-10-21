import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Navigating to HBSPL MERN Stack opening...');
    await p.goto('https://hbspl.in/jobs/mern-stack-developer-hbspl-wfh-entry-level-jobs/?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const info = await p.evaluate(() => {
      const applyBtns = Array.from(document.querySelectorAll('a, button')).filter(el => (el.innerText || '').toLowerCase().includes('apply'));
      return {
        title: document.title,
        applyBtns: applyBtns.map(b => ({ text: b.innerText.trim(), href: b.href || '' })),
        forms: document.querySelectorAll('form').length,
        bodySnippet: document.body.innerText.slice(0, 400)
      };
    });
    console.log('HBSPL info:', JSON.stringify(info, null, 2));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
