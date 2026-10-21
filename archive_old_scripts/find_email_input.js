import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('placementindia.com'));
    if (!page) {
      console.log('No placementindia page found');
      return;
    }

    const emailInputInfo = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        placeholder: i.placeholder,
        value: i.value,
        outerHTML: i.outerHTML
      })).filter(x => (x.placeholder || '').toLowerCase().includes('email') || (x.name || '').toLowerCase().includes('email') || (x.id || '').toLowerCase().includes('email'));
    });
    console.log('Email elements found:', JSON.stringify(emailInputInfo, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
