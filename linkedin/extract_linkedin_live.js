import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
    if (!page) return;

    // Expand all '...more' buttons on visible posts
    await page.evaluate(() => {
      const moreBtns = Array.from(document.querySelectorAll('button')).filter(b => b.innerText.trim().toLowerCase() === 'more' || b.innerText.trim().toLowerCase() === '… more');
      moreBtns.forEach(b => b.click());
    });
    await new Promise(r => setTimeout(r, 1000));

    // Extract authors and text
    const posts = await page.evaluate(() => {
      // Find all main containers on search results
      const cards = Array.from(document.querySelectorAll('.update-components-text, .feed-shared-update-v2__description, div.feed-shared-text, div[class*="update-components-text"]'));
      return cards.map(c => c.innerText.trim()).filter(Boolean);
    });

    console.log(`Found ${posts.length} text containers.`);
    const unique = Array.from(new Set(posts));
    console.log(`Unique post contents: ${unique.length}`);

    unique.slice(0, 10).forEach((p, i) => {
      console.log(`\n================ POST #${i+1} ================`);
      console.log(p.replace(/\n+/g, ' \n '));
    });

    fs.writeFileSync('linkedin_posts_live.json', JSON.stringify(unique, null, 2));

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
