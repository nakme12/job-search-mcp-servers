import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging') || p.url().includes('linkedin.com'));
  if (!liPage) {
    console.error('LinkedIn page not found');
    await browser.disconnect();
    return;
  }

  console.log('Clicking "Guys, don\'t ignore this group" conversation...');
  await liPage.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversation-card'));
    const target = cards.find(c => c.innerText.includes("Guys, don't ignore"));
    if (target) {
      target.click();
    }
  });

  await sleep(3500);

  // Scroll up inside the message thread to load last 7 days of messages
  console.log('Scrolling up in message history to load older messages...');
  const msgThread = await liPage.$('.msg-s-message-list-container, .msg-s-message-list, ul.msg-s-message-list');
  if (msgThread) {
    for (let i = 0; i < 15; i++) {
      await liPage.evaluate(() => {
        const container = document.querySelector('.msg-s-message-list-container') || document.querySelector('.msg-s-message-list');
        if (container) {
          container.scrollTop = 0;
        }
      });
      await sleep(1000);
    }
  }

  console.log('Extracting all messages and post links from the chat...');
  const chatMessages = await liPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem'));
    return items.map(it => {
      const author = it.querySelector('.msg-s-message-group__name, .msg-s-event-listitem__name')?.innerText?.trim() || '';
      const time = it.querySelector('time')?.innerText?.trim() || it.querySelector('.msg-s-message-group__timestamp')?.innerText?.trim() || '';
      const text = it.innerText.replace(/\n+/g, ' \n ');
      const links = Array.from(it.querySelectorAll('a')).map(a => a.href).filter(h => !h.includes('/in/') && !h.includes('/messaging/'));
      return { author, time, text, links };
    });
  });

  console.log(`Extracted ${chatMessages.length} total messages.`);
  fs.writeFileSync('scripts/guys_dont_raw_messages.json', JSON.stringify(chatMessages, null, 2));

  await browser.disconnect();
}

main().catch(console.error);
