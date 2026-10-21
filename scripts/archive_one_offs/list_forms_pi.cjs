const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await p.evaluate(() => {
      const btn = document.querySelector('a.btn-dark#applyJob');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    const forms = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('form')).map(f => ({
        id: f.id,
        name: f.name,
        className: f.className,
        parentTag: f.parentElement.tagName,
        parentId: f.parentElement.id,
        display: window.getComputedStyle(f).display,
        parentDisplay: window.getComputedStyle(f.parentElement).display
      }));
    });
    console.log('All forms:', forms);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
