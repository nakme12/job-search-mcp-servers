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

    const modalHTML = await page.evaluate(() => {
      // Find modal container
      const modal = document.querySelector('.modal, .popup, [class*="modal"], [class*="popup"], [role="dialog"]') || document.body;
      // Get all inputs and selects inside dialog
      const elements = Array.from(modal.querySelectorAll('input, select, textarea, button')).map(el => ({
        tag: el.tagName,
        id: el.id,
        name: el.name,
        type: el.type,
        placeholder: el.placeholder,
        value: el.value,
        className: el.className
      }));
      return elements;
    });

    console.log('Modal form elements:', JSON.stringify(modalHTML, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
