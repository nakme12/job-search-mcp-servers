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

    const visibility = await p.evaluate(() => {
      const ca = document.querySelector('#createAccount');
      const box = ca ? ca.getBoundingClientRect() : null;
      const step1 = document.querySelector('#step1');
      const step1Box = step1 ? step1.getBoundingClientRect() : null;
      return {
        createAccountBox: box,
        step1Box: step1Box,
        caDisplay: ca ? window.getComputedStyle(ca).display : null,
        caVisibility: ca ? window.getComputedStyle(ca).visibility : null
      };
    });
    console.log('Visibility & Bounding box:', visibility);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
