const puppeteer = require('puppeteer-core');

async function checkPentharaErrors() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('zohorecruit.com'));
  if (!page) {
    console.log('page not found');
    process.exit(1);
  }

  const result = await page.evaluate(() => {
    // Collect all elements with red text or error classes
    const errors = Array.from(document.querySelectorAll('*')).filter(el => {
      const s = window.getComputedStyle(el);
      const isRed = s.color === 'rgb(255, 0, 0)' || s.color === 'red' || s.color === 'rgb(220, 53, 69)';
      const hasErrorClass = el.className && typeof el.className === 'string' && el.className.toLowerCase().includes('error');
      return (isRed || hasErrorClass) && el.innerText.trim().length > 0;
    }).map(e => e.innerText.trim());

    // Check HTML5 invalid elements
    const invalids = Array.from(document.querySelectorAll(':invalid')).map(el => {
      const p = el.closest('tr, div.form-group, .cw-field-row') || el.parentElement;
      return {
        label: p ? p.innerText.split('\n')[0] : 'none',
        name: el.name,
        msg: el.validationMessage
      };
    });

    return {
      errors: Array.from(new Set(errors)),
      invalids
    };
  });

  console.log('Errors Result:\n', JSON.stringify(result, null, 2));
  process.exit(0);
}

checkPentharaErrors().catch(err => {
  console.error(err);
  process.exit(1);
});
