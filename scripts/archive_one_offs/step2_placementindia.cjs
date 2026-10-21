const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    await page.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-lifease-solutions-llp-at-sector-135-noida-1360632.htm', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a, button'));
      const apply = all.find(el => el.innerText && el.innerText.trim() === 'Apply');
      if (apply) apply.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    
    const emailField = await page.$('input[placeholder*="Email"]');
    if (emailField) {
      await emailField.type('pratikpatidar7990@gmail.com');
      await new Promise(r => setTimeout(r, 1000));
      
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const cont = btns.find(b => b.innerText && b.innerText.includes('Continue'));
        if (cont) cont.click();
      });
      
      await new Promise(r => setTimeout(r, 4000));
      await page.screenshot({ path: 'screenshots/2026-10-12/placementindia_step2.png' });
      
      const snippet = await page.evaluate(() => document.body.innerText.slice(0, 800));
      console.log('MODAL_STEP2_TEXT:\n', snippet);
    }
    await page.close();
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
})();
