const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('career.infosys.com'));
  if (p) {
    const pageCheck = await p.evaluate(() => {
      const iframes = Array.from(document.querySelectorAll('iframe')).map(f => f.src);
      const forms = Array.from(document.querySelectorAll('form')).map(f => ({
        classes: f.className,
        valid: f.classList.contains('ng-valid'),
        invalid: f.classList.contains('ng-invalid')
      }));
      const captcha = Array.from(document.querySelectorAll('[class*="captcha"], [id*="captcha"], [class*="recaptcha"]')).map(el => el.outerHTML);
      return { iframes, forms, captcha };
    });
    console.log(JSON.stringify(pageCheck, null, 2));
  }
  b.disconnect();
})();
