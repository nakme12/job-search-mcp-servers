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
    const btnOnclick = await p.evaluate(() => {
      const sub = document.querySelector('#createAccount button, #createAccount input[type="submit"]');
      const form = document.querySelector('#createAccount');
      return {
        btn: sub ? { outerHTML: sub.outerHTML, onclick: sub.getAttribute('onclick') } : null,
        formOnsubmit: form ? form.getAttribute('onsubmit') : null,
        formDataAction: form ? form.getAttribute('data-action') : null,
        formDataType: form ? form.getAttribute('data-type') : null
      };
    });
    console.log('Submit button & form onsubmit:', btnOnclick);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
