import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) return;

  // Let's click on the element inside the card that triggers opening
  console.log('Focusing and clicking Guys don\'t ignore group card...');
  await liPage.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversation-card'));
    const target = cards.find(c => c.innerText.includes("Guys, don't ignore"));
    if (target) {
      target.scrollIntoView({ behavior: 'instant', block: 'center' });
      // Click every interactive child or the card itself
      const clickables = target.querySelectorAll('a, button, div[role="button"], p, span');
      for (const el of clickables) {
        if (el.innerText.includes("Guys, don't ignore")) {
          el.click();
          break;
        }
      }
      target.click();
    }
  });

  await sleep(3000);

  // Take screenshot of messaging view to see what opened
  await liPage.screenshot({ path: 'scripts/li_messaging_debug.png' });
  console.log('Screenshot saved to scripts/li_messaging_debug.png');

  await browser.disconnect();
}

main().catch(console.error);
