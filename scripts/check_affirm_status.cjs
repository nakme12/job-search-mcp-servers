const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm'));
  if (!page) {
    console.log('Affirm tab closed or redirected!');
    browser.disconnect();
    return;
  }

  const res = await page.evaluate(() => {
    const text = document.body.innerText.toLowerCase();
    const isSuccess = text.includes('thank you') || 
                      text.includes('application submitted') || 
                      text.includes('received your application') ||
                      text.includes('application has been received');
    
    const errors = Array.from(document.querySelectorAll('.error, [aria-invalid="true"], .field-error, .validation-error, [data-error]'))
      .map(e => e.innerText.trim())
      .filter(Boolean);

    return {
      isSuccess,
      errors,
      url: window.location.href,
      pageTextExcerpt: document.body.innerText.slice(0, 300)
    };
  });

  console.log('Affirm Post-Submit Check:', JSON.stringify(res, null, 2));
  browser.disconnect();
})();
