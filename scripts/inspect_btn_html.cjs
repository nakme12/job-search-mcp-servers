const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('career.infosys.com'));
  if (p) {
    const btnHtml = await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().toUpperCase() === 'SEND');
      return {
        btnOuter: btn ? btn.outerHTML : null,
        parentHtml: btn ? btn.parentElement.innerHTML : null
      };
    });
    console.log(JSON.stringify(btnHtml, null, 2));
  }
  b.disconnect();
})();
