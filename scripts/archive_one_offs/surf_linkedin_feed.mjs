import puppeteer from 'puppeteer';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) return;

  console.log('Navigating to LinkedIn home feed...');
  await liPage.goto('https://www.linkedin.com/feed/', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await sleep(4000);

  console.log('Surfing and scrolling LinkedIn feed to surface best latest frontend/MERN jobs...');
  const discoveredPosts = [];

  for (let scroll = 0; scroll < 10; scroll++) {
    const posts = await liPage.evaluate(() => {
      const feedItems = Array.from(document.querySelectorAll('.feed-shared-update-v2, div[data-urn*="activity"]'));
      return feedItems.map(item => {
        const urn = item.getAttribute('data-urn') || '';
        const author = item.querySelector('.update-components-actor__name, .feed-shared-actor__name')?.innerText?.trim() || '';
        const text = item.innerText || '';
        const links = Array.from(item.querySelectorAll('a')).map(a => a.href).filter(h => !h.includes('/in/') && !h.includes('/feed/'));
        return { urn, author, text, links };
      });
    });

    posts.forEach(p => {
      if (p.text && !discoveredPosts.some(d => d.urn === p.urn || d.text.slice(0, 100) === p.text.slice(0, 100))) {
        discoveredPosts.push(p);
      }
    });

    await liPage.evaluate(() => window.scrollBy(0, 1200));
    await sleep(2000);
  }

  console.log(`Discovered ${discoveredPosts.length} posts from LinkedIn feed.`);
  
  // Filter for relevant frontend/react/nextjs/mern hiring posts
  const relevantHiring = discoveredPosts.filter(p => {
    const t = p.text.toLowerCase();
    const hasRole = t.includes('react') || t.includes('frontend') || t.includes('front-end') || t.includes('mern') || t.includes('next.js');
    const isHiring = t.includes('hiring') || t.includes('opening') || t.includes('we are looking') || t.includes('apply') || t.includes('job');
    return hasRole && isHiring;
  });

  console.log(`Found ${relevantHiring.length} relevant hiring posts on feed.`);
  fs.writeFileSync('scripts/feed_surfed_jobs.json', JSON.stringify(relevantHiring, null, 2));

  // Take screenshot of feed
  await liPage.screenshot({ path: 'screenshots/2026-10-12/linkedin_feed_surf.png' });
  console.log('Saved feed screenshot to screenshots/2026-10-12/linkedin_feed_surf.png');

  await browser.disconnect();
}

main().catch(console.error);
