import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function harvestLinkedInCards() {
  console.log(`\n================ HARVESTING LINKEDIN 0-2 YOE POSTS ================`);
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const liPage = pages.find(p => p.url().includes('linkedin.com'));
    if (!liPage) {
      console.log('No active LinkedIn tab found.');
      return [];
    }

    console.log('Connected to live LinkedIn session. Current URL:', liPage.url());

    const queries = [
      'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22Junior%22%20OR%20%220-2%22%20AND%20%22React%22%20AND%20%22hiring%22&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
      'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22React%22%20AND%20%22Indore%22%20AND%20%22hiring%22&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
      'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22Frontend%22%20%22resume%22%20%22hiring%22%20India&origin=FACETED_SEARCH&sortBy=%22date_posted%22'
    ];

    const allDiscovered = [];

    for (const qUrl of queries) {
      console.log(`Navigating LinkedIn search query...`);
      await liPage.goto(qUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
      await sleep(3500);

      for (let s = 0; s < 4; s++) {
        const posts = await liPage.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('.feed-shared-update-v2, div[data-urn*="activity"]'));
          return cards.map(c => {
            const authorEl = c.querySelector('.update-components-actor__name, .feed-shared-actor__name, span[dir="ltr"]');
            const author = authorEl ? authorEl.innerText.trim() : '';
            const descEl = c.querySelector('.update-components-actor__description');
            const authorTitle = descEl ? descEl.innerText.trim() : '';
            const text = c.innerText || '';
            const urn = c.getAttribute('data-urn') || '';
            return { author, authorTitle, text, urn };
          });
        });

        posts.forEach(p => {
          if (p.text && p.text.length > 50 && !allDiscovered.some(x => x.urn === p.urn || x.text.slice(0, 80) === p.text.slice(0, 80))) {
            allDiscovered.push(p);
          }
        });

        await liPage.evaluate(() => window.scrollBy(0, 1000));
        await sleep(1500);
      }
    }

    console.log(`Discovered ${allDiscovered.length} total LinkedIn posts.`);
    await browser.disconnect();
    return allDiscovered;
  } catch (err) {
    console.error('LinkedIn harvest error:', err.message);
    if (browser) await browser.disconnect();
    return [];
  }
}
