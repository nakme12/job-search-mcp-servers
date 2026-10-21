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

    // 1. Fill userEmail and trigger onblur / input / change
    const emailSet = await page.evaluate(() => {
      const el = document.getElementById('userEmail');
      if (el) {
        el.value = 'patidarpratik0099@gmail.com';
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        return 'Email set to: ' + el.value;
      }
      return 'userEmail not found';
    });
    console.log(emailSet);

    // 2. Hide or remove the locality dropdown list overlay that is blocking clicks
    await page.evaluate(() => {
      const lists = Array.from(document.querySelectorAll('ul.ui-autocomplete, .ui-menu, .autocomplete-suggestions, div[style*="z-index"]'));
      for (const l of lists) {
        if (l.innerText && l.innerText.includes('Vijay Nagar')) {
          l.style.display = 'none';
        }
      }
    });

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_ready_to_click_submit.png' });

    // 3. Click the Submit Application button directly via DOM click
    const submitRes = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button, input[type="submit"], a, div'));
      const btn = allBtns.find(b => (b.innerText || b.value || '').trim() === 'Submit Application');
      if (btn) {
        btn.click();
        return 'Successfully clicked Submit Application element: ' + btn.tagName;
      }
      return 'Submit button not found';
    });
    console.log(submitRes);

    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_final_submit_result.png' });

    const pageText = await page.evaluate(() => document.body.innerText.slice(0, 1000).replace(/\s+/g, ' '));
    console.log('Page text snapshot:', pageText.slice(0, 300));

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
