import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null, protocolTimeout: 60000 });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('placementindia.com'));
  if (!page) {
    console.log('No placementindia tab found');
    await browser.disconnect();
    return;
  }

  console.log('Fixing gender select & submitting application on PlacementIndia...');

  // Set gender
  await page.evaluate(() => {
    const g = document.querySelector('#gender');
    if (g) {
      g.value = 'M'; // Male / Mr.
      if (!g.value) {
        // Find option with Mr.
        for (const opt of g.options) {
          if (opt.text.includes('Mr.')) {
            g.value = opt.value;
            break;
          }
        }
      }
      g.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 1000));

  // Pre submit screenshot
  const screenshotDir = path.resolve('screenshots/2026-10-13');
  if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });
  await page.screenshot({ path: path.resolve(screenshotDir, 'placementindia_interhaul_presubmit.png') });
  console.log('Pre-submit screenshot updated');

  // Click Submit Application
  await page.evaluate(() => {
    const popup = document.querySelector('.popup_box');
    if (popup) {
      const submitBtn = Array.from(popup.querySelectorAll('button[type="submit"], input[type="submit"]')).find(b => (b.innerText || b.value || '').toLowerCase().includes('submit'));
      if (submitBtn) submitBtn.click();
    }
  });

  console.log('Waiting 6s for response...');
  await new Promise(r => setTimeout(r, 6000));

  // Check state
  const state = await page.evaluate(() => {
    const popup = document.querySelector('.popup_box');
    const thanks = document.querySelector('#final_thanks_message');
    const errs = Array.from(document.querySelectorAll('.error, .err, .error_bdr')).filter(e => window.getComputedStyle(e).display !== 'none');
    return {
      url: window.location.href,
      popupText: popup ? popup.innerText.slice(0, 300) : '',
      thanksDisplay: thanks ? window.getComputedStyle(thanks).display : 'none',
      hasErrors: errs.length > 0
    };
  });

  console.log('State after submit:', state);
  await page.screenshot({ path: path.resolve(screenshotDir, 'placementindia_interhaul_postsubmit.png') });
  console.log('Post-submit screenshot updated');

  await browser.disconnect();
})();
