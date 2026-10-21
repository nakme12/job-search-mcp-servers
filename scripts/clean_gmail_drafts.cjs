const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com/mail/u/1/'));
  if (!gmailPage) {
    console.log('NO_PAGE');
    await browser.disconnect();
    return;
  }

  console.log('Clicking discard on all open draft dialogs...');
  const count = await gmailPage.evaluate(() => {
    const discardBtns = Array.from(document.querySelectorAll('div[data-tooltip*="Discard"], div[aria-label*="Discard"]'));
    discardBtns.forEach(b => b.click());
    return discardBtns.length;
  });
  console.log(`Discarded ${count} drafts.`);

  await gmailPage.goto('https://mail.google.com/mail/u/1/#inbox', { waitUntil: 'networkidle2', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));
  console.log('Returned to clean inbox.');

  await browser.disconnect();
})().catch(console.error);
