const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('career.infosys.com'));
  if (p) {
    const details = await p.evaluate(() => {
      const inp = document.querySelector('#mat-input-0, input[name="expemailInndImg"]');
      const btn = document.querySelector('button[name="send"]') ||
                  Array.from(document.querySelectorAll('button')).find(el => el.innerText.trim().toUpperCase() === 'SEND');
      return {
        inpVal: inp ? inp.value : null,
        inpValid: inp ? inp.getAttribute('aria-invalid') : null,
        btnDisabled: btn ? btn.disabled : null,
        btnClasses: btn ? btn.className : null
      };
    });
    console.log(JSON.stringify(details, null, 2));
  }
  b.disconnect();
})();
