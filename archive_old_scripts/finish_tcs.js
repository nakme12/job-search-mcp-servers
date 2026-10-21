import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('tata-consultancy-services-4478511534') || p.url().includes('4478511534'));

  if (!page) {
    console.log('TCS page not found');
    return;
  }

  await page.bringToFront();

  // Find all text inputs inside the modal
  const inputs = await page.$$('.jobs-easy-apply-modal input[type="text"]');
  console.log(`Found ${inputs.length} text inputs.`);

  for (let i = 0; i < inputs.length; i++) {
    const input = inputs[i];
    await input.click({ clickCount: 3 });
    await page.keyboard.press('Backspace');
    await new Promise(r => setTimeout(r, 100));

    // Inspect label of this input
    const label = await page.evaluate(el => {
      const container = el.closest('.jobs-easy-apply-form-section__grouping, div');
      return (container ? container.innerText : '').toLowerCase();
    }, input);

    let val = '2';
    if (label.includes('notice period') || label.includes('days of notice')) {
      val = '0';
    }

    console.log(`Input ${i}: typing "${val}" (label: ${label.replace(/\n/g, ' ').slice(0, 40)})`);
    await input.type(val, { delay: 50 });
    await new Promise(r => setTimeout(r, 200));
  }

  await page.screenshot({ path: 'screenshots/2026-10-13/tcs_typed_success.png' });
  console.log('Saved tcs_typed_success.png');

  // Click Review button
  const reviewClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.jobs-easy-apply-modal button'));
    const rev = btns.find(b => (b.innerText || '').trim().toLowerCase() === 'review');
    if (rev) {
      rev.click();
      return true;
    }
    return false;
  });

  console.log('Review button clicked:', reviewClicked);
  await new Promise(r => setTimeout(r, 2000));

  await page.screenshot({ path: 'screenshots/2026-10-13/tcs_final_pre_submit_proof.png' });
  console.log('Pre-submit proof saved: screenshots/2026-10-13/tcs_final_pre_submit_proof.png');
})();
