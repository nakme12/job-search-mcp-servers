import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();
    console.log('Navigating cleanly to Interhaul Logistics...');
    await page.goto('https://www.placementindia.com/job-detail/mern-stack-developer-in-interhaul-logistics-at-work-from-home-1333584.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Inspect initial page
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button'));
      const b = btns.find(x => (x.innerText || '').trim().toLowerCase() === 'apply');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Step 1: Mobile
    await page.evaluate(() => {
      const mob = document.querySelector('input[placeholder*="Email ID / Mobile"], input[placeholder*="Mobile"]');
      if (mob) {
        mob.value = '8269647990';
        mob.dispatchEvent(new Event('input', { bubbles: true }));
        mob.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const cont = Array.from(document.querySelectorAll('button, a')).find(x => (x.innerText || '').trim().toLowerCase().includes('continue'));
      if (cont) cont.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    // Inspect inputs inside the active modal
    const inputDump = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input:not([type="hidden"]), select')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        placeholder: el.placeholder,
        value: el.value,
        outerHTML: el.outerHTML
      }));
    });
    console.log('Step 2 Modal Inputs:', JSON.stringify(inputDump, null, 2));

  } catch (err) {
    console.error(err.message);
  }
})();
