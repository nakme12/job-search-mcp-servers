const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (p) {
    const nav = await p.evaluate(() => {
      // Look for elements with "1–50" or similar
      const countEl = Array.from(document.querySelectorAll('span, div')).find(el => /\d+–\d+ of \d+/.test(el.innerText));
      const parent = countEl ? countEl.parentElement.innerHTML : 'not found';
      return {
        countText: countEl ? countEl.innerText : null,
        parentHtml: parent
      };
    });
    console.log(JSON.stringify(nav, null, 2));
  }
  b.disconnect();
})();
