import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('linkedin.com'));
    if (!page) {
      page = await browser.newPage();
    }
    await page.bringToFront();

    // Natural clean query for posts
    const naturalUrl = 'https://www.linkedin.com/search/results/content/?keywords=hiring%20frontend%20developer%20react&sortBy=%22date_posted%22';
    console.log('Navigating to:', naturalUrl);
    await page.goto(naturalUrl, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await new Promise(r => setTimeout(r, 4500));

    // Scroll 3 times
    for (let i = 0; i < 3; i++) {
      await page.evaluate(() => window.scrollBy(0, 1200));
      await new Promise(r => setTimeout(r, 2000));
    }

    await page.screenshot({ path: 'screenshots/2026-10-12/linkedin_natural_posts.png' });
    console.log('Screenshot saved: screenshots/2026-10-12/linkedin_natural_posts.png');

    const rawPosts = await page.evaluate(() => {
      // Multiple possible container classes for posts in search
      const cards = Array.from(document.querySelectorAll('.feed-shared-update-v2, .search-results-container div[data-urn], div.update-components-actor'));
      return cards.map((c, idx) => {
        const text = (c.innerText || '').trim();
        return { id: idx + 1, text };
      }).filter(p => p.text.length > 50);
    });

    console.log(`Found ${rawPosts.length} post containers.`);
    fs.writeFileSync('linkedin_natural_posts.json', JSON.stringify(rawPosts, null, 2));

    // Print first 5 posts
    rawPosts.slice(0, 5).forEach((p, idx) => {
      console.log(`\n=== Post #${idx+1} ===`);
      console.log(p.text.slice(0, 300).replace(/\n+/g, ' '));
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
