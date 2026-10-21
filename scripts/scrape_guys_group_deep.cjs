const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) {
    console.log('NO_TAB');
    await browser.disconnect();
    return;
  }

  console.log('Scrolling up inside group chat to load older messages...');
  
  // Scroll up inside the message scroll container
  for (let i = 0; i < 5; i++) {
    await liPage.evaluate(() => {
      const scrollable = document.querySelector('.msg-s-message-list-scroll, .msg-s-message-list, [class*="message-list-scroll"]');
      if (scrollable) {
        scrollable.scrollTop = 0;
      } else {
        window.scrollBy(0, -1000);
      }
    });
    await new Promise(r => setTimeout(r, 1500));
  }

  const allMessages = await liPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem'));
    return items.map(el => {
      const author = el.querySelector('.msg-s-message-group__name, [class*="profile-link"]')?.innerText.trim() || '';
      const time = el.querySelector('time')?.innerText.trim() || '';
      const text = el.innerText.trim();
      const links = Array.from(el.querySelectorAll('a')).map(a => a.href).filter(h => h && !h.includes('messaging'));
      return { author, time, text, links };
    });
  });

  console.log('TOTAL_SCROLLED_MESSAGES:', allMessages.length);
  fs.writeFileSync('scripts/guys_group_all_messages.json', JSON.stringify(allMessages, null, 2));
  console.log('Saved to scripts/guys_group_all_messages.json');

  await browser.disconnect();
})().catch(console.error);
