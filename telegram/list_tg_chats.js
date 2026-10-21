import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = (await browser.pages()).find(p => p.url().includes('web.telegram.org'));
    if (!page) {
      console.log('No TG page');
      return;
    }

    const chats = await page.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.chat-title, .peer-title, .ListItem-title, h3, .user-caption'));
      return items.map(el => el.innerText.trim()).filter(Boolean);
    });
    console.log('TG Chat Titles:', JSON.stringify(chats, null, 2));

  } catch (err) {
    console.error(err.message);
  }
})();
