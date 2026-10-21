import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) {
    console.error('LinkedIn tab not found');
    await browser.disconnect();
    return;
  }

  console.log('Navigating LinkedIn tab to messaging...');
  await liPage.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await sleep(4000);

  // Click on "Guys, don't ignore this group"
  console.log('Opening "Guys, don\'t ignore this group" conversation...');
  await liPage.evaluate(() => {
    const listItems = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversation-card'));
    const target = listItems.find(it => it.innerText.includes("Guys, don't ignore"));
    if (target) {
      target.click();
    }
  });

  await sleep(3500);

  // Scroll message thread up smoothly to load past 7 days
  console.log('Loading past messages...');
  for (let i = 0; i < 8; i++) {
    await liPage.evaluate(() => {
      const el = document.querySelector('.msg-s-message-list-container') || document.querySelector('.msg-s-message-list');
      if (el) el.scrollTop = 0;
    });
    await sleep(1200);
  }

  // Extract all messages
  console.log('Extracting messages...');
  const data = await liPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem'));
    return items.map(el => {
      const text = el.innerText || '';
      const links = Array.from(el.querySelectorAll('a')).map(a => a.href).filter(h => !h.includes('/in/') && !h.includes('/messaging/'));
      return { text, links };
    });
  });

  console.log(`Extracted ${data.length} messages from "Guys, don't ignore this group"`);
  fs.writeFileSync('scripts/guys_dont_raw_posts.json', JSON.stringify(data, null, 2));

  await browser.disconnect();
}

main().catch(console.error);
