const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const ramp = pages.find(p => p.url().includes('jobs.ashbyhq.com/ramp'));
  if (!ramp) {
    console.log('Ramp page not found');
    return;
  }
  const result = await ramp.evaluate(() => {
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

    function setReactVal(el, val) {
      if (!el) return;
      if (el.tagName === 'TEXTAREA') textareaSetter.call(el, val);
      else inputSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const nameInp = document.querySelector('input[name="_systemfield_name"]');
    const emailInp = document.querySelector('input[name="_systemfield_email"]');
    const phoneInp = document.querySelector('input[type="tel"]');

    setReactVal(nameInp, 'Pratik Patidar');
    setReactVal(emailInp, 'pratikpatidar7990@gmail.com');
    setReactVal(phoneInp, '+91 82696 47990');

    return {
      name: nameInp ? nameInp.value : 'missing',
      email: emailInp ? emailInp.value : 'missing',
      phone: phoneInp ? phoneInp.value : 'missing'
    };
  });

  console.log('React 18 Injection Result:', result);
})();
