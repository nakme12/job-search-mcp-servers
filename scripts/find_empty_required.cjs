const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm'));
  if (!page) {
    console.log('Affirm tab not found');
    browser.disconnect();
    return;
  }

  const unfilled = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
    return inputs.filter(el => {
      if (el.type === 'hidden') return false;
      const isReq = el.required || el.getAttribute('aria-required') === 'true' || el.closest('div')?.innerText.includes('*');
      const isEmpty = !el.value || el.value.trim() === '';
      return isReq && isEmpty;
    }).map(el => {
      const lbl = el.closest('label')?.innerText || 
                  (el.id ? document.querySelector(`label[for="${el.id}"]`)?.innerText : '') || 
                  el.placeholder || el.name || el.id;
      return { tag: el.tagName, type: el.type, name: el.name, id: el.id, label: (lbl || '').replace(/\s+/g, ' ').trim() };
    });
  });

  console.log('Remaining Unfilled Required Fields:', JSON.stringify(unfilled, null, 2));
  browser.disconnect();
})();
