import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function adoptAndSign() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('payments-setup'));
  if (!page) return;

  const target = page.frames().find(f => f.url().includes('links.taxbandits.io')) || page;

  console.log('Clicking "Adopt & Sign"...');
  await target.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const adoptBtn = btns.find(b => b.innerText && b.innerText.includes('Adopt & Sign'));
    if (adoptBtn) adoptBtn.click();
  });
  await sleep(2500);

  // After signature modal closes, look for the final "Finish" or "Submit Form" button
  console.log('Looking for final Submit / Finish button on W-8BEN...');
  await target.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
    const finishBtn = btns.find(b => b.innerText && (b.innerText.toLowerCase().includes('finish') || b.innerText.toLowerCase().includes('submit') || b.innerText.toLowerCase().includes('complete')));
    if (finishBtn) finishBtn.click();
  });
  await sleep(3500);

  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_w8ben_submitted.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_w8ben_submitted.png');

  await browser.disconnect();
}

adoptAndSign().catch(console.error);
