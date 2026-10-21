import puppeteer from 'puppeteer-core';

async function clickFinishTopBottom() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('payments-setup'));
  if (!page) return;

  const target = page.frames().find(f => f.url().includes('links.taxbandits.io')) || page;

  // Let's inspect all buttons in this frame to find the final submission button
  const buttons = await target.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')).map(b => ({
      text: b.innerText.trim(),
      id: b.id,
      className: b.className
    }));
  });
  console.log('Available Buttons in TaxBandits frame:', JSON.stringify(buttons, null, 2));

  // Usually there's a floating or top/bottom header button like "Finish" or "Complete"
  const clicked = await target.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    for (const el of all) {
      const t = (el.innerText || '').toLowerCase().trim();
      if ((t === 'finish' || t === 'complete' || t === 'submit') && (el.tagName === 'BUTTON' || el.tagName === 'A' || el.getAttribute('role') === 'button')) {
        el.click();
        return 'Clicked: ' + el.tagName + ' with text ' + t;
      }
    }
    return 'No finish button found';
  });
  console.log('Finish Action:', clicked);

  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_tax_complete.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_tax_complete.png');

  await browser.disconnect();
}

clickFinishTopBottom().catch(console.error);
