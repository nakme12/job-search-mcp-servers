const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = (await b.pages()).find(x => x.url().includes('career.infosys.com'));

  if (p) {
    const info = await p.evaluate(() => {
      const inp = document.querySelector('#mat-input-0');
      const form = inp ? inp.closest('form') : null;
      const btn = document.querySelector('button[name="send"]');
      const errors = Array.from(document.querySelectorAll('mat-error, .mat-error')).map(e => e.innerText);
      return {
        inputValue: inp?.value,
        inputClasses: inp?.className,
        inputAttrs: inp ? Array.from(inp.attributes).map(a => `${a.name}="${a.value}"`) : [],
        formClasses: form?.className,
        btnDisabled: btn?.disabled,
        btnClasses: btn?.className,
        errors
      };
    });
    console.log(JSON.stringify(info, null, 2));
  }
  await b.disconnect();
})();
