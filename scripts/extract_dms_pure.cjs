const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) {
    console.log('NO_TAB');
    await browser.disconnect();
    return;
  }

  const dms = await liPage.evaluate(() => {
    const list = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversations-container__convo-item'));
    return list.map(item => {
      const name = item.querySelector('.msg-conversation-listitem__participant-names, [class*="participant-names"]')?.innerText.trim() || '';
      const snippet = item.querySelector('.msg-conversation-card__message-snippet, [class*="message-snippet"]')?.innerText.trim() || '';
      const time = item.querySelector('time')?.innerText.trim() || '';
      const hasUnread = !!item.querySelector('.msg-conversation-card__unread-count, [class*="unread"]');
      return { name, snippet, time, hasUnread };
    }).filter(x => x.name || x.snippet);
  });

  console.log('EXTRACTED_DMS:', JSON.stringify(dms, null, 2));
  await browser.disconnect();
})().catch(console.error);
