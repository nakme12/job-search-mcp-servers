const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    await page.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-lifease-solutions-llp-at-sector-135-noida-1360632.htm', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));

    const clickRes = await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a, button'));
      const apply = all.find(el => el.innerText && el.innerText.trim() === 'Apply');
      if (apply) {
        apply.click();
        return true;
      }
      return false;
    });
    console.log('CLICKED_APPLY:', clickRes);
    await new Promise(r => setTimeout(r, 3000));
    console.log('NEW_URL:', page.url());
    
    await page.screenshot({ path: 'screenshots/2026-10-12/placementindia_after_apply.png' });
    const bodySnippet = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log('PAGE_SNIPPET:\n', bodySnippet);
    await page.close();
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
})();
