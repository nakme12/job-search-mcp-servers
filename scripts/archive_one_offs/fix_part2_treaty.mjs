import puppeteer from 'puppeteer-core';

async function fixPart2Treaty() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('payments-setup'));
  if (!page) return;

  const target = page.frames().find(f => f.url().includes('links.taxbandits.io')) || page;

  console.log('Unchecking Part II Treaty check (Standard W-8BEN for India independent contractor services)...');
  await target.evaluate(() => {
    // If Part II is optional, unchecking the treaty claim removes the requirement for Article & Paragraph
    const cbs = Array.from(document.querySelectorAll('input[type="checkbox"]'));
    const treatyCb = cbs.find(c => {
      const parent = c.closest('div');
      return parent && parent.innerText && parent.innerText.includes('beneficial owner is a resident of');
    });
    if (treatyCb && treatyCb.checked) {
      treatyCb.click();
    }
  });

  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_treaty_fixed.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_treaty_fixed.png');

  await browser.disconnect();
}

fixPart2Treaty().catch(console.error);
