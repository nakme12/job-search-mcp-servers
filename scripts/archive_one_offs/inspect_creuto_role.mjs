import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Visiting Creuto careers...');
    await p.goto('https://creuto.com/careers/mern-stack-developer?utm_campaign=google_jobs_apply&utm_source=google_jobs_apply&utm_medium=organic', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const info = await p.evaluate(() => {
      const applyBtn = Array.from(document.querySelectorAll('a, button')).filter(el => (el.innerText || '').toLowerCase().includes('apply'));
      return {
        title: document.title,
        applyBtns: applyBtn.map(b => ({ text: b.innerText, href: b.href || '' })),
        forms: document.querySelectorAll('form').length,
        bodySnippet: document.body.innerText.slice(0, 300)
      };
    });
    console.log('Creuto info:', info);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
