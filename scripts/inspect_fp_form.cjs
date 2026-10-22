const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = (await b.pages()).find(x => x.url().includes('career.infosys.com'));

  if (p) {
    const formFields = await p.evaluate(() => {
      const form = document.querySelector('.ForgotPasswordForm');
      if (!form) return 'No form';
      const allEls = Array.from(form.querySelectorAll('*')).map(el => ({
        tag: el.tagName,
        id: el.id,
        className: el.className,
        text: el.innerText ? el.innerText.trim() : '',
        name: el.getAttribute('name'),
        formControlName: el.getAttribute('formcontrolname')
      })).filter(el => el.formControlName || el.name || el.tag === 'IFRAME' || el.className.includes('captcha') || el.className.includes('recaptcha'));
      return { allEls, htmlSnippet: form.innerHTML.substring(0, 800) };
    });
    console.log(JSON.stringify(formFields, null, 2));
  }
  await b.disconnect();
})();
