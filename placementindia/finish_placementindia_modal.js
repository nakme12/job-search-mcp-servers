import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('placementindia.com'));
    if (!page) {
      console.log('No placementindia page open.');
      return;
    }
    console.log('Interacting with modal on:', page.url());

    // Click Continue on the modal
    const clickedContinue = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]'));
      const cont = btns.find(b => (b.innerText || b.value || '').trim().toLowerCase().includes('continue'));
      if (cont) {
        cont.click();
        return 'Clicked Continue';
      }
      return 'Continue button not found';
    });
    console.log(clickedContinue);

    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_after_continue.png' });

    // Check if next step asks for password / OTP or shows registration fields
    const step2Info = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"])')).map(i => ({
        type: i.type,
        name: i.name,
        placeholder: i.placeholder,
        id: i.id
      }));
      const text = document.body.innerText.slice(0, 500);
      return { inputs, text };
    });
    console.log('Step 2 DOM info:', JSON.stringify(step2Info, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
