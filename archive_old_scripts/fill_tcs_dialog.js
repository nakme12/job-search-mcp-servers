import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages[2]; // Page 2 is LinkedIn TCS

  console.log('Focusing page 2:', page.url());
  await page.bringToFront();

  // Inspect what elements are on this page
  const res = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return 'No dialog found on page 2';

    const inputs = Array.from(dialog.querySelectorAll('input, textarea, select')).map(el => ({
      tagName: el.tagName,
      id: el.id,
      name: el.name,
      value: el.value,
      className: el.className
    }));

    return {
      title: dialog.querySelector('h1, h2, h3')?.innerText,
      inputs
    };
  });

  console.log('Dialog status on page 2:', JSON.stringify(res, null, 2));

  // Fill using dispatchEvent & Native Value Setter (React bypass)
  await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return;

    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;

    const inputs = Array.from(dialog.querySelectorAll('input[type="text"], input:not([type])'));
    inputs.forEach(inp => {
      const container = inp.closest('.jobs-easy-apply-form-section__grouping, div');
      const text = (container ? container.innerText : '').toLowerCase();

      let val = '2';
      if (text.includes('notice period') || text.includes('days of notice')) {
        val = '0';
      }

      nativeInputValueSetter.call(inp, val);
      inp.dispatchEvent(new Event('input', { bubbles: true }));
      inp.dispatchEvent(new Event('change', { bubbles: true }));
      inp.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      inp.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
    });
  });

  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: 'screenshots/2026-10-13/tcs_react_setter_filled.png' });
  console.log('Saved tcs_react_setter_filled.png');

  // Click Review button
  const reviewClicked = await page.evaluate(() => {
    const dialog = document.querySelector('div[role="dialog"]');
    if (!dialog) return false;
    const btn = Array.from(dialog.querySelectorAll('button')).find(b => (b.innerText || '').trim().toLowerCase() === 'review');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });

  console.log('Review button clicked:', reviewClicked);
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: 'screenshots/2026-10-13/tcs_final_pre_submit.png' });
  console.log('Saved tcs_final_pre_submit.png');

})();
