import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  try {
    const applyUrl = 'https://jobs.worldline.com/talentcommunity/apply/304985/?locale=en_US';
    console.log('Navigating to Worldline Talent Community Application Form:', applyUrl);
    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    console.log('Application page loaded:', await page.title());

    // Inspect inputs on the form
    const formFields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs.map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute('aria-label')
      }));
    });

    console.log('Discovered Form Fields:', JSON.stringify(formFields, null, 2));
    await page.screenshot({ path: 'screenshots/2026-10-13/worldline_form_initial.png' });

    // Fill common profile fields if matching
    const fillResult = await page.evaluate(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          return true;
        }
        return false;
      };

      const res = {};
      res.email = setVal('input[type="email"], input[name*="email" i], input[id*="email" i]', 'pratikpatidar7990@gmail.com');
      res.firstName = setVal('input[name*="first" i], input[id*="first" i]', 'Pratik');
      res.lastName = setVal('input[name*="last" i], input[id*="last" i]', 'Patidar');
      res.phone = setVal('input[type="tel"], input[name*="phone" i], input[name*="mobile" i], input[id*="phone" i]', '8269647990');
      return res;
    });

    console.log('Filled fields:', fillResult);
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'screenshots/2026-10-13/worldline_form_filled.png' });
    console.log('Pre-submit screenshot saved: screenshots/2026-10-13/worldline_form_filled.png');

  } catch (err) {
    console.error('Error filling Worldline:', err.message);
  }
})();
