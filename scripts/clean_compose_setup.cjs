const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  // Close/Discard all existing open compose boxes
  console.log('Discarding any existing open draft dialogs...');
  await p.evaluate(() => {
    const discardBtns = Array.from(document.querySelectorAll('div[role="button"][data-tooltip*="Discard"], div[aria-label*="Discard"]'));
    discardBtns.forEach(d => d.click());
  });
  await sleep(1500);

  // Navigate cleanly to inbox
  await p.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await sleep(2500);

  // Click Compose
  console.log('Clicking fresh Compose...');
  await p.evaluate(() => {
    const composeBtn = document.querySelector('div[role="button"][gh="cm"], div.T-I.T-I-KE[role="button"]');
    if (composeBtn) composeBtn.click();
  });
  await sleep(2000);

  // Inspect the clean compose box
  const fields = await p.evaluate(() => {
    const toInput = document.querySelector('input[aria-label="To recipients"]');
    const subjInput = document.querySelector('input[name="subjectbox"]');
    const editor = document.querySelector('div[aria-label="Message Body"]');
    return {
      hasTo: !!toInput,
      hasSubj: !!subjInput,
      hasEditor: !!editor
    };
  });

  console.log('Clean compose box fields:', JSON.stringify(fields, null, 2));
  b.disconnect();
})();
