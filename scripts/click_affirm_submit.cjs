const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm'));
  if (!page) {
    console.log('Affirm tab not found');
    browser.disconnect();
    return;
  }

  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"]')).map(b => ({
      tag: b.tagName,
      id: b.id,
      type: b.type,
      text: (b.innerText || b.value || '').trim()
    }));
  });
  console.log('Found Buttons:', JSON.stringify(buttons, null, 2));

  // Click Submit
  const submitBtn = await page.$('#submit_app, button[id*="submit"], input[id*="submit"], button[type="submit"]');
  if (submitBtn) {
    console.log('Found submit button, clicking...');
    await submitBtn.click();
  } else {
    console.log('Submit button not found by standard selector');
  }

  browser.disconnect();
})();
