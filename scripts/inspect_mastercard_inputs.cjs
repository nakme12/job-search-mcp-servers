const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    const mcApplyUrl = 'https://careers.mastercard.com/us/en/apply?jobSeqNo=MASRUSR293576EXTERNALENUS&source=LINKEDIN';
    await page.goto(mcApplyUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));
    
    const visible = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea')).filter(el => el.type !== 'hidden');
      return inputs.map(el => ({
        id: el.id,
        name: el.name,
        type: el.type,
        label: (el.closest('.form-group, label, div')?.innerText || '').replace(/\n+/g, ' ').slice(0, 50)
      }));
    });
    
    console.log('Visible inputs on Mastercard Step 1:\n', JSON.stringify(visible, null, 2));
    await page.close();
  } catch(e) {
    console.log('Error:', e.message);
  }
})();
