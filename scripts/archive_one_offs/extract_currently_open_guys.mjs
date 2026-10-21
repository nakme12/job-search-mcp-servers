import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) return;

  // The conversation is already open!
  // Scroll up inside the chat body to fetch all history
  console.log('Scrolling up in message list...');
  for (let i = 0; i < 25; i++) {
    await liPage.evaluate(() => {
      // Find scrollable container inside the right pane
      const pane = document.querySelector('.msg-thread__scroll-container, .msg-s-message-list-container, ul.msg-s-message-list');
      if (pane) {
        pane.scrollTop = 0;
      }
    });
    await sleep(700);
  }

  // Extract all message elements and post embeds
  console.log('Extracting messages and post embeds...');
  const results = await liPage.evaluate(() => {
    const list = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem, .msg-s-message-group'));
    return list.map(item => {
      const sender = item.querySelector('.msg-s-message-group__name, .msg-s-event-listitem__name')?.innerText?.trim() || '';
      const time = item.querySelector('time')?.innerText?.trim() || item.querySelector('.msg-s-message-group__timestamp')?.innerText?.trim() || '';
      const text = item.innerText || '';
      const links = Array.from(item.querySelectorAll('a')).map(a => a.href).filter(h => !h.includes('/in/') && !h.includes('/messaging/'));
      return { sender, time, text, links };
    });
  });

  console.log(`Extracted ${results.length} total message events.`);
  fs.writeFileSync('scripts/guys_dont_scraped_posts.json', JSON.stringify(results, null, 2));

  await browser.disconnect();
}

main().catch(console.error);
