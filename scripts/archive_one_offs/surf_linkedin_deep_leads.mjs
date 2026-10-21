import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) return;

  const queries = [
    { label: 'React Developer hiring resume', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22React%22%20AND%20%22hiring%22%20AND%20%22resume%22&origin=FACETED_SEARCH&sortBy=%22date_posted%22' },
    { label: 'Frontend Developer hiring email', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22Frontend%20Developer%22%20AND%20%22send%20your%20resume%22%20OR%20%22share%20your%20resume%22&origin=FACETED_SEARCH&sortBy=%22date_posted%22' },
    { label: 'Next.js React Developer hiring', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=%22Next.js%22%20AND%20%22React%22%20AND%20%22hiring%22&origin=FACETED_SEARCH&sortBy=%22date_posted%22' }
  ];

  const leads = [];

  for (const q of queries) {
    console.log(`Scanning query: ${q.label}...`);
    await liPage.goto(q.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    for (let scroll = 0; scroll < 6; scroll++) {
      const posts = await liPage.evaluate(() => {
        const matches = [];
        const items = document.querySelectorAll('div.feed-shared-update-v2, div[data-view-name="feed-full-update"], li.reusable-search__result-container');
        items.forEach(el => {
          const text = el.innerText?.replace(/\s+/g, ' ');
          if (text && text.length > 50) {
            const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
            const links = Array.from(el.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('feed/update') || h.includes('lnkd.in'));
            matches.push({ text: text.slice(0, 1000), emails, links });
          }
        });
        return matches;
      });

      posts.forEach(p => {
        if (!leads.some(l => l.text.slice(0, 80) === p.text.slice(0, 80))) {
          leads.push(p);
        }
      });

      await liPage.evaluate(() => window.scrollBy(0, 1200));
      await sleep(1800);
    }
  }

  console.log(`Total harvested posts: ${leads.length}`);
  fs.writeFileSync('scripts/fresh_linkedin_leads_deep.json', JSON.stringify(leads, null, 2));

  // Screenshot proof
  await liPage.screenshot({ path: 'screenshots/2026-10-12/linkedin_deep_feed_proof.png' });
  console.log('Saved proof to screenshots/2026-10-12/linkedin_deep_feed_proof.png');

  await browser.disconnect();
}

main().catch(console.error);
