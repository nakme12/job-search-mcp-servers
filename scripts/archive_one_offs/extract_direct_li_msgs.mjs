import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) {
    console.error('LinkedIn messaging page not found');
    await browser.disconnect();
    return;
  }

  console.log('Extracting loaded messages directly...');
  const chatMessages = await liPage.evaluate(() => {
    const events = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem, .msg-s-message-group'));
    return events.map(ev => {
      const sender = ev.querySelector('.msg-s-message-group__name, h4, .msg-s-event-listitem__name')?.innerText?.trim() || '';
      const time = ev.querySelector('time, .msg-s-message-group__timestamp')?.innerText?.trim() || '';
      const text = ev.innerText.replace(/\s+/g, ' ');
      const links = Array.from(ev.querySelectorAll('a')).map(a => a.href).filter(h => !h.includes('/in/') && !h.includes('/messaging/'));
      return { sender, time, text, links };
    });
  });

  console.log(`Extracted ${chatMessages.length} messages.`);
  fs.writeFileSync('scripts/guys_dont_raw_messages.json', JSON.stringify(chatMessages, null, 2));

  await browser.disconnect();
}

main().catch(console.error);
