const puppeteer = require('puppeteer-core');

async function inspectSubmitButton() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane')) || pages[0];
  
  const btnState = await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"]');
    if (!btn) return 'NO_BUTTON';
    return {
      text: btn.innerText.trim(),
      disabled: btn.disabled,
      rect: btn.getBoundingClientRect()
    };
  });
  console.log('Submit button state:', btnState);
  await browser.disconnect();
}
inspectSubmitButton().catch(console.error);
