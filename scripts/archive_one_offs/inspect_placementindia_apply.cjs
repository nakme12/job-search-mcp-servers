const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    console.log('Testing PlacementIndia 1st URL...');
    await p.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    console.log('Title:', await p.title());
    
    // Click Apply
    const applyClicked = await p.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a, button'));
      const apply = all.find(el => el.innerText && el.innerText.trim() === 'Apply');
      if (apply) {
        apply.click();
        return true;
      }
      return false;
    });
    console.log('Apply button clicked:', applyClicked);
    await new Promise(r => setTimeout(r, 3000));
    
    const popupInfo = await p.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        placeholder: el.placeholder,
        text: el.innerText ? el.innerText.trim() : ''
      }));
      return {
        inputs: inputs.filter(i => i.placeholder || i.name || i.text),
        bodySnippet: document.body.innerText.substring(0, 400)
      };
    });
    console.log('Popup info:', JSON.stringify(popupInfo, null, 2));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
