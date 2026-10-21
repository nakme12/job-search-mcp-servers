import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) return;

  // Click on Guys don't ignore this group card
  console.log('Finding and clicking "Guys, don\'t ignore this group" card...');
  const clicked = await liPage.evaluate(() => {
    const listItems = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversation-card'));
    for (const item of listItems) {
      if (item.innerText.includes("Guys, don't ignore") || item.innerText.includes("Guys, don’t ignore")) {
        const linkOrButton = item.querySelector('a, button, div[role="button"]') || item;
        linkOrButton.click();
        return { success: true, text: item.innerText.slice(0, 100) };
      }
    }
    return { success: false };
  });

  console.log('Clicked result:', clicked);
  await sleep(4000);

  // Check new header
  const header = await liPage.evaluate(() => {
    return document.querySelector('.msg-thread__header, .msg-title_title, .msg-entity-lockup__entity-title')?.innerText?.replace(/\n+/g, ' ');
  });
  console.log('New active chat header:', header);

  // Scroll up to load all past 7 days messages
  console.log('Scrolling up inside group chat...');
  for (let i = 0; i < 15; i++) {
    await liPage.evaluate(() => {
      const scrollable = document.querySelector('.msg-s-message-list-container') || document.querySelector('.msg-s-message-list');
      if (scrollable) {
        scrollable.scrollTop = 0;
      }
    });
    await sleep(1000);
  }

  // Extract all messages and posts
  const messages = await liPage.evaluate(() => {
    const events = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem'));
    return events.map(e => {
      const sender = e.querySelector('.msg-s-message-group__name, .msg-s-event-listitem__name')?.innerText?.trim() || '';
      const time = e.querySelector('time')?.innerText?.trim() || e.querySelector('.msg-s-message-group__timestamp')?.innerText?.trim() || '';
      const text = e.innerText.replace(/\n+/g, ' \n ');
      const links = Array.from(e.querySelectorAll('a')).map(a => a.href).filter(h => !h.includes('/in/') && !h.includes('/messaging/'));
      return { sender, time, text, links };
    });
  });

  console.log(`Extracted ${messages.length} messages from the group chat.`);
  fs.writeFileSync('scripts/guys_dont_group_messages.json', JSON.stringify(messages, null, 2));

  await browser.disconnect();
}

main().catch(console.error);
