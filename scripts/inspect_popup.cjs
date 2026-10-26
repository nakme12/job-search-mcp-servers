const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const popup = pages.find(p => p.url().includes('firebaseapp.com') || p.url().includes('accounts.google.com'));
  if (popup) {
    await popup.bringToFront();
    console.log('Popup Title:', await popup.title());
    console.log('Popup URL:', popup.url());

    const accounts = await popup.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div[data-email], li, .identifier, div[role="link"]')).map(el => el.innerText.replace(/\n+/g, ' | '));
      return {
        snippet: document.body.innerText.substring(0, 400).replace(/\n+/g, ' '),
        accounts: els.slice(0, 5)
      };
    });
    console.log(JSON.stringify(accounts, null, 2));

    // Look for pratikpatidar7990@gmail.com and click it
    await popup.evaluate(() => {
      const pratik = Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.includes('pratikpatidar7990@gmail.com'));
      if (pratik) {
        console.log('Found pratik account, clicking...');
        pratik.click();
      }
    });
  } else {
    console.log('Popup not found');
  }
  b.disconnect();
})();
