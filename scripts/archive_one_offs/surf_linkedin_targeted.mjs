import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) return;

  // Let's surf the LinkedIn search feed for recent hiring posts (past 24h)
  const queries = [
    'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20frontend%20react&origin=FACETED_SEARCH&sortBy=%22date_posted%22',
    'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20mern%20stack&origin=FACETED_SEARCH&sortBy=%22date_posted%22'
  ];

  const allHarvested = [];

  for (const q of queries) {
    console.log(`Navigating to: ${q}...`);
    await liPage.goto(q, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    for (let scroll = 0; scroll < 6; scroll++) {
      const posts = await liPage.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.feed-shared-update-v2, div[data-chameleon-result-urn]'));
        return items.map(el => {
          const text = el.innerText || '';
          const author = el.querySelector('.update-components-actor__name')?.innerText?.trim() || '';
          const links = Array.from(el.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('feed/update') || h.includes('mailto:') || h.includes('linkedin.com/posts'));
          return { author, text, links };
        });
      });

      posts.forEach(p => {
        if (p.text && p.text.length > 50 && !allHarvested.some(h => h.text.slice(0, 80) === p.text.slice(0, 80))) {
          allHarvested.push(p);
        }
      });

      await liPage.evaluate(() => window.scrollBy(0, 1000));
      await sleep(1500);
    }
  }

  console.log(`Harvested ${allHarvested.length} fresh hiring posts from past 24 hours!`);
  fs.writeFileSync('scripts/fresh_surfed_posts.json', JSON.stringify(allHarvested, null, 2));

  await liPage.screenshot({ path: 'screenshots/2026-10-12/linkedin_recent_posts.png' });
  console.log('Saved screenshot to screenshots/2026-10-12/linkedin_recent_posts.png');

  await browser.disconnect();
}

main().catch(console.error);
