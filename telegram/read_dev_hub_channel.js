import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = (await browser.pages()).find(p => p.url().includes('web.telegram.org'));
    if (!page) {
      console.log('No TG page');
      return;
    }

    // Click Developer Hub | Jobs & Referrals
    const clicked = await page.evaluate(() => {
      const allChats = Array.from(document.querySelectorAll('.chat-title, .peer-title, .ListItem-title, h3, .user-caption'));
      const target = allChats.find(el => (el.innerText || '').includes('Developer Hub') || (el.innerText || '').includes('Jobs & Referrals'));
      if (target) {
        target.click();
        return 'Clicked ' + target.innerText;
      }
      return 'Target not found';
    });
    console.log(clicked);

    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: 'screenshots/2026-10-12/dev_hub_channel_view.png' });

    // Extract last 20 messages
    const msgs = await page.evaluate(() => {
      const msgEls = Array.from(document.querySelectorAll('.message, .Message, .text-content, .message-content'));
      return msgEls.map(m => m.innerText.trim()).filter(Boolean);
    });

    console.log(`Extracted ${msgs.length} messages from Developer Hub.`);
    msgs.slice(-15).forEach((m, idx) => {
      console.log(`\n=== JOB POST ${idx+1} ===`);
      console.log(m.slice(0, 350));
    });

  } catch (err) {
    console.error(err.message);
  }
})();
