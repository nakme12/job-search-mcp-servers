import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) return;

  const queries = [
    { name: 'MERN Stack', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20mern%20stack&origin=FACETED_SEARCH&sortBy=%22date_posted%22' },
    { name: 'React Developer', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20react%20developer&origin=FACETED_SEARCH&sortBy=%22date_posted%22' },
    { name: 'Frontend Developer Indore', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20frontend%20developer%20indore&origin=FACETED_SEARCH&sortBy=%22date_posted%22' }
  ];

  const harvested = [];

  for (const q of queries) {
    console.log(`Searching query: ${q.name}...`);
    await liPage.goto(q.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(3500);

    for (let s = 0; s < 5; s++) {
      const posts = await liPage.evaluate(() => {
        // LinkedIn post cards selector
        const cards = Array.from(document.querySelectorAll('div.fie-impression-container, div[data-chameleon-result-urn], div.feed-shared-update-v2'));
        return cards.map(c => {
          const text = c.innerText?.replace(/\s+/g, ' ') || '';
          const author = c.querySelector('span.update-components-actor__name, span.entity-result__title-text')?.innerText?.trim() || '';
          const links = Array.from(c.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('feed/update') || h.includes('lnkd.in') || h.includes('mailto:'));
          const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          return { author, text, links, emails };
        });
      });

      posts.forEach(p => {
        if (p.text.length > 40 && !harvested.some(h => h.text.slice(0, 80) === p.text.slice(0, 80))) {
          harvested.push(p);
        }
      });

      await liPage.evaluate(() => window.scrollBy(0, 1000));
      await sleep(1500);
    }
  }

  console.log(`Successfully harvested ${harvested.length} live posts!`);
  fs.writeFileSync('scripts/live_harvested_surfed_jobs.json', JSON.stringify(harvested, null, 2));

  // Take screenshot of best results
  await liPage.screenshot({ path: 'screenshots/2026-10-12/linkedin_surfed_proof.png' });
  console.log('Saved proof screenshot to screenshots/2026-10-12/linkedin_surfed_proof.png');

  await browser.disconnect();
}

main().catch(console.error);
