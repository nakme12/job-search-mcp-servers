const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const amex = pages.find(p => p.url().includes('oraclecloud.com'));
  if (!amex) {
    console.log('AmEx not found');
    return;
  }
  const data = await amex.evaluate(() => {
    const errorEls = Array.from(document.querySelectorAll('.oj-message-detail, .oj-text-field-error, [role="alert"], .alert'));
    const allInputs = Array.from(document.querySelectorAll('input, button')).map(el => ({
      tag: el.tagName,
      id: el.id,
      type: el.type,
      text: el.innerText ? el.innerText.trim() : '',
      value: el.value,
      disabled: el.disabled
    }));
    return {
      errors: errorEls.map(e => e.innerText.trim()),
      allInputs
    };
  });
  console.log('AmEx Status:', JSON.stringify(data, null, 2));
})();
