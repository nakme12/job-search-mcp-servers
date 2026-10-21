const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    const doverUrl = 'https://app.dover.com/apply/kulfi/25724642-9216-4ad8-b0fd-fce0151eee35?rs=42706078';
    await page.goto(doverUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));
    
    const fields = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
      return inputs.map(el => {
        // Find label text or surrounding field text
        let label = '';
        let parent = el.parentElement;
        for (let i = 0; i < 4; i++) {
          if (!parent) break;
          const text = parent.innerText.trim();
          if (text && text.length > 2 && text.length < 100) {
            label = text;
            break;
          }
          parent = parent.parentElement;
        }
        return {
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          label: label.replace(/\n+/g, ' ')
        };
      });
    });
    
    console.log('Kulfi Dover Form Input Details:\n', JSON.stringify(fields, null, 2));
    await page.close();
  } catch(e) {
    console.log('Error:', e.message);
  }
})();
