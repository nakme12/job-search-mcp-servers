import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) return;

  const queries = [
    { title: 'Frontend Developer', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20frontend%20developer&origin=FACETED_SEARCH&sortBy=%22date_posted%22' },
    { title: 'React Developer', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20react%20developer&origin=FACETED_SEARCH&sortBy=%22date_posted%22' },
    { title: 'MERN Stack', url: 'https://www.linkedin.com/search/results/content/?datePosted=%22past-24h%22&keywords=hiring%20mern%20stack&origin=FACETED_SEARCH&sortBy=%22date_posted%22' }
  ];

  const harvestedJobs = [];

  for (const q of queries) {
    console.log(`Scanning live posts for: ${q.title}...`);
    await liPage.goto(q.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(4000);

    for (let scroll = 0; scroll < 6; scroll++) {
      const posts = await liPage.evaluate(() => {
        // Collect all post cards in search results
        const items = Array.from(document.querySelectorAll('ul[role="list"] > li, div.search-results-container li, div.fie-impression-container'));
        return items.map(it => {
          const text = it.innerText?.replace(/\s+/g, ' ') || '';
          const author = it.querySelector('.update-components-actor__name, .app-aware-link')?.innerText?.trim() || '';
          const links = Array.from(it.querySelectorAll('a')).map(a => a.href).filter(h => h.includes('feed/update') || h.includes('posts/') || h.includes('lnkd.in'));
          const emails = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) || [];
          return { author, text, links, emails };
        });
      });

      posts.forEach(p => {
        if (p.text && p.text.length > 80 && !harvestedJobs.some(h => h.text.slice(0, 100) === p.text.slice(0, 100))) {
          harvestedJobs.push(p);
        }
      });

      await liPage.evaluate(() => window.scrollBy(0, 1200));
      await sleep(1500);
    }
  }

  console.log(`Extracted ${harvestedJobs.length} raw live hiring posts from past 24 hours!`);

  // Filter for candidate fit: 0-2 YOE, React/Next/Frontend/MERN, exclude Senior/Lead/5+ YOE
  const qualifiedBestFit = [];
  harvestedJobs.forEach(j => {
    const t = j.text.toLowerCase();
    const isSenior = t.includes('7+ years') || t.includes('5+ years') || t.includes('lead') || t.includes('architect') || t.includes('principal');
    const isRelevant = t.includes('frontend') || t.includes('react') || t.includes('mern') || t.includes('next.js') || t.includes('web developer');
    const isHiring = t.includes('hiring') || t.includes('looking for') || t.includes('we are hiring') || t.includes('opening');

    if (!isSenior && isRelevant && isHiring) {
      qualifiedBestFit.push(j);
    }
  });

  console.log(`Qualified Best-Fit for Pratik (0-2 YOE): ${qualifiedBestFit.length} posts.`);
  fs.writeFileSync('scripts/linkedin_surfed_best_fit.json', JSON.stringify(qualifiedBestFit, null, 2));

  await liPage.screenshot({ path: 'screenshots/2026-10-12/linkedin_surfed_results_live.png' });
  console.log('Saved proof screenshot to screenshots/2026-10-12/linkedin_surfed_results_live.png');

  await browser.disconnect();
}

main().catch(console.error);
