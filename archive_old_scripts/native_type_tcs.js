import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('Tata+Consultancy+Services') || p.url().includes('4478511534'));

  if (!page) {
    console.log('Page not found');
    return;
  }

  await page.bringToFront();

  // Find all inputs in the dialog
  const inputSelectors = await page.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('.jobs-easy-apply-modal input[type="text"], [role="dialog"] input[type="text"]'));
    return inputs.map((inp, idx) => ({ idx, id: inp.id }));
  });

  console.log('Found inputs:', inputSelectors);

  // Type natively into each input using puppeteer page.type
  for (let item of inputSelectors) {
    const sel = `#${item.id}`;
    await page.click(sel, { clickCount: 3 });
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 200));

    // Determine value: last one is notice period (0 or 15), others are years (2)
    const labelText = await page.evaluate(s => {
      const el = document.querySelector(s);
      return (el?.closest('.jobs-easy-apply-form-section__grouping, div')?.innerText || '').toLowerCase();
    }, sel);

    let val = '2';
    if (labelText.includes('notice period') || labelText.includes('days of notice')) {
      val = '0';
    }
    
    console.log(`Typing "${val}" into ${sel} (${labelText.slice(0, 30)})`);
    await page.type(sel, val, { delay: 100 });
    await new Promise(r => setTimeout(r, 300));
  }

  await page.screenshot({ path: 'screenshots/2026-10-13/tcs_typed_native.png' });
  console.log('Native type complete, saved tcs_typed_native.png');

  // Click Review button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rev = btns.find(b => (b.innerText || '').trim().toLowerCase() === 'review');
    if (rev) rev.click();
  });

  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: 'screenshots/2026-10-13/tcs_final_review_step.png' });
  console.log('Final review screenshot saved!');

})();
