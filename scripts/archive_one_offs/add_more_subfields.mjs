import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function addMoreSubfields() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) return;

  console.log('Adding HTML, Computer Programming, and UX Design to subfields...');
  const targets = ['html', 'computer programming', 'ux design', 'data structures & algorithms'];

  for (const t of targets) {
    // Focus search input
    const input = await page.$('input[id="_r_3n_"]');
    if (input) {
      await input.click();
      await sleep(400);
      await input.type(t, { delay: 50 });
      await sleep(600);
      await page.keyboard.press('Enter');
      await sleep(600);
      // Clear input text
      await page.evaluate(el => el.value = '', input);
    }
  }

  await sleep(1000);
  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_multi_subfields.png' });
  console.log('Saved multi-subfield screenshot.');

  await browser.disconnect();
}

addMoreSubfields().catch(console.error);
