import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = (await browser.pages()).find(p => p.url().includes('web.telegram.org'));
    if (!page) {
      console.log('No TG page');
      return;
    }

    const posts = await page.evaluate(() => {
      const bubbles = Array.from(document.querySelectorAll('.message, .Message, .bubble, .text-content'));
      return bubbles.map(b => b.innerText.trim()).filter(t => t.length > 30);
    });

    const unique = Array.from(new Set(posts));
    fs.writeFileSync('devhub_all_dumped_posts.json', JSON.stringify(unique, null, 2));
    console.log(`Saved ${unique.length} posts to devhub_all_dumped_posts.json`);

  } catch (err) {
    console.error(err.message);
  }
})();
