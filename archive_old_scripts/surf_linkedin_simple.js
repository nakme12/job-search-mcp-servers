import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
    if (!page) return;

    // Direct clean query: "hiring frontend developer" without boolean complexity
    const url = 'https://www.linkedin.com/search/results/content/?keywords=hiring%20frontend%20developer&sortBy=%22date_posted%22';
    console.log('Navigating to simple query:', url);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 4500));

    // Scroll
    for (let i = 0; i < 4; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200));
      await new Promise(r => setTimeout(r, 1500));
    }

    await page.screenshot({ path: 'screenshots/2026-10-12/linkedin_simple_posts.png' });

    // Extract all text content
    const posts = await page.evaluate(() => {
      // Collect visible post blocks
      const items = Array.from(document.querySelectorAll('div[data-view-name*="feed-full-update"], .feed-shared-update-v2, div.feed-shared-update-v2__description-wrapper, div[data-urn*="activity"]'));
      return items.map(el => el.innerText.trim()).filter(t => t.length > 50);
    });

    console.log(`Found ${posts.length} visible posts.`);
    const unique = Array.from(new Set(posts));
    console.log(`Unique posts: ${unique.length}`);

    unique.slice(0, 8).forEach((p, i) => {
      console.log(`\n================ POST #${i+1} ================`);
      console.log(p.replace(/\n+/g, ' \n ').slice(0, 400));
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
