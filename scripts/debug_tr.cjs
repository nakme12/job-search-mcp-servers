const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  const result = await p.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('tr')).filter(tr => tr.innerText && tr.innerText.trim().length > 5);
    return trs.slice(0, 5).map(tr => tr.innerText.replace(/\n+/g, ' | '));
  });
  console.log('Valid Sent TRs:', JSON.stringify(result, null, 2));
  b.disconnect();
})();
