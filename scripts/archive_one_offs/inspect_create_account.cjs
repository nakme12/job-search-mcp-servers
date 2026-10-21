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
    const ca = await p.evaluate(() => {
      const form = document.querySelector('#createAccount');
      return form ? {
        action: form.action,
        method: form.method,
        parent: form.parentElement ? form.parentElement.className + ' (id: ' + form.parentElement.id + ')' : null,
        parentStyle: form.parentElement ? window.getComputedStyle(form.parentElement).display : null,
        inputs: Array.from(form.querySelectorAll('input, select, button')).map(el => ({
          name: el.name,
          id: el.id,
          type: el.type,
          text: el.innerText ? el.innerText.trim() : ''
        }))
      } : null;
    });
    console.log('createAccount details:', JSON.stringify(ca, null, 2));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
