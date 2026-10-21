const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let p = pages.find(page => page.url().includes('cursor.com/careers'));
  if (!p) {
    console.log('No Cursor careers page found!');
    return;
  }

  const inputs = await p.evaluate(() => {
    const form = document.querySelector('form');
    if (!form) return 'No form found';
    return Array.from(form.querySelectorAll('input, select, textarea, button')).map(el => {
      let label = el.closest('label') ? el.closest('label').innerText : '';
      if (!label && el.id) {
        const lbl = document.querySelector(`label[for="${el.id}"]`);
        if (lbl) label = lbl.innerText;
      }
      return {
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        label: label.trim(),
        text: el.innerText ? el.innerText.trim() : ''
      };
    });
  });

  console.log('Cursor form inputs:\n', JSON.stringify(inputs, null, 2));
})();
