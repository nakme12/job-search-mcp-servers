import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function setExactIndia() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('payments-setup'));
  if (!page) return;

  const target = page.frames().find(f => f.url().includes('links.taxbandits.io')) || page;

  console.log('Selecting exact India (IN)...');
  await target.evaluate(() => {
    const selects = Array.from(document.querySelectorAll('select'));
    selects.forEach(s => {
      // Find option with exact text 'India' or value 'IN'
      for (const opt of s.options) {
        if (opt.text.trim() === 'India' || opt.value === 'IN') {
          s.value = opt.value;
          s.dispatchEvent(new Event('change', { bubbles: true }));
          break;
        }
      }
    });
  });
  await sleep(1000);

  // Click Finish (btnSave)
  console.log('Clicking Finish...');
  await target.evaluate(() => {
    const b = document.getElementById('btnSave');
    if (b) b.click();
  });
  await sleep(4000);

  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_final_india_submitted.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_final_india_submitted.png');

  await browser.disconnect();
}

setExactIndia().catch(console.error);
