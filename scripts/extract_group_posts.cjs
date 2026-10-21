const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) return;

  const groupDetails = await liPage.evaluate(() => {
    // Collect all message bubble items currently loaded in the active group thread
    const items = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem'));
    return items.map(el => {
      const author = el.querySelector('.msg-s-message-group__name, [class*="profile-link"]')?.innerText.trim() || '';
      const time = el.querySelector('time')?.innerText.trim() || '';
      const text = el.innerText.trim();
      const links = Array.from(el.querySelectorAll('a')).map(a => a.href).filter(h => h && !h.includes('messaging'));
      return { author, time, text: text.slice(0, 400), links };
    });
  });

  console.log('GROUP_MESSAGES_COUNT:', groupDetails.length);
  console.log('GROUP_MESSAGES:', JSON.stringify(groupDetails.slice(-6), null, 2));

  await browser.disconnect();
})().catch(console.error);
