const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const pages = await browser.pages();
    const gmail = pages.find(p => p.url().includes('mail.google.com'));
    if (!gmail) return;
    
    const info = await gmail.evaluate(() => {
      const dialogs = document.querySelectorAll('div[role="dialog"]');
      return {
        count: dialogs.length,
        text: Array.from(dialogs).map(d => d.innerText.slice(0, 100))
      };
    });
    console.log('Dialogs in Gmail:', JSON.stringify(info, null, 2));
  } catch(e) {
    console.log('Error:', e.message);
  }
})();
