const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com/mail/u/1/'));
  if (!gmailPage) {
    console.log('NO_GMAIL_PAGE');
    await browser.disconnect();
    return;
  }

  console.log('Current URL:', gmailPage.url());
  console.log('Navigating to root inbox...');
  await gmailPage.goto('https://mail.google.com/mail/u/1/#inbox', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));

  const composeBtn = await gmailPage.$('div[role="button"][gh="cm"]');
  console.log('Compose button found:', !!composeBtn);

  if (composeBtn) {
    await composeBtn.click();
    console.log('Clicked compose button.');
    await new Promise(r => setTimeout(r, 2500));
    const toInput = await gmailPage.$('input[role="combobox"][aria-label*="To"], input[peoplekit-id]');
    console.log('Compose dialog open (To input exists):', !!toInput);
  }

  await browser.disconnect();
})().catch(console.error);
