import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) return;

  // Click card index 2 specifically
  console.log('Clicking card 2...');
  const cardBox = await liPage.evaluate(() => {
    const cards = document.querySelectorAll('.msg-conversation-listitem, .msg-conversation-card');
    const target = cards[2] || cards[3];
    if (!target) return null;
    const r = target.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  if (cardBox) {
    await liPage.mouse.click(cardBox.x, cardBox.y);
    console.log('Clicked at', cardBox);
  }
  await sleep(4000);

  const headerText = await liPage.evaluate(() => {
    const h = document.querySelector('.msg-thread__header, .msg-title_title, .msg-entity-lockup__entity-title, h2.msg-entity-lockup__entity-title');
    return h ? h.innerText.replace(/\n+/g, ' ') : 'No header found';
  });
  console.log('Opened conversation header:', headerText);

  // Scroll up repeatedly
  console.log('Scrolling up to load past 7 days...');
  for (let i = 0; i < 20; i++) {
    await liPage.evaluate(() => {
      const container = document.querySelector('.msg-s-message-list-container') || document.querySelector('.msg-s-message-list') || document.querySelector('.msg-thread__scroll-container');
      if (container) container.scrollTop = 0;
    });
    await sleep(800);
  }

  // Extract all messages
  const msgs = await liPage.evaluate(() => {
    const list = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem, .msg-s-message-group'));
    return list.map(item => {
      const author = item.querySelector('.msg-s-message-group__name, .msg-s-event-listitem__name')?.innerText?.trim() || '';
      const time = item.querySelector('time')?.innerText?.trim() || '';
      const text = item.innerText || '';
      const links = Array.from(item.querySelectorAll('a')).map(a => a.href).filter(h => !h.includes('/in/') && !h.includes('/messaging/'));
      return { author, time, text, links };
    });
  });

  console.log(`Extracted ${msgs.length} messages from "Guys, don't ignore" group.`);
  fs.writeFileSync('scripts/guys_dont_full_group_msgs.json', JSON.stringify(msgs, null, 2));

  await browser.disconnect();
}

main().catch(console.error);
