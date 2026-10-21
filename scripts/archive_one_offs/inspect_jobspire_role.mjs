import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Visiting JobSpire Weekday AI job...');
    await p.goto('https://jobspire.in/jobs/view/1253521?utm_source=adzuna&utm_medium=adzuna', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const info = await p.evaluate(() => {
      const applyBtn = Array.from(document.querySelectorAll('a, button')).find(el => (el.innerText || '').toLowerCase().includes('apply'));
      return {
        title: document.title,
        applyText: applyBtn ? applyBtn.innerText : null,
        applyHref: applyBtn ? applyBtn.href || applyBtn.getAttribute('href') : null,
        bodySnippet: document.body.innerText.slice(0, 300)
      };
    });
    console.log('JobSpire info:', info);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
