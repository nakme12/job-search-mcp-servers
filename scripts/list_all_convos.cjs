const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) {
    console.log('NO_LINKEDIN_MESSAGING_TAB');
    await browser.disconnect();
    return;
  }

  // Find Keerti Chourasiya and Disha Pushpad conversation items
  const convos = await liPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversations-container__convo-item'));
    return items.map((item, idx) => ({
      idx,
      text: item.innerText.replace(/\n+/g, ' | ')
    }));
  });

  console.log('ALL CONVERSATIONS:');
  convos.forEach(c => console.log(`[${c.idx}] ${c.text}`));

  await browser.disconnect();
})().catch(console.error);
