import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('linkedin.com'));
    if (!page) return;

    // Extract text from visible post cards on the page
    const cards = await page.evaluate(() => {
      // In LinkedIn search content results, posts are wrapped inside li or div in search results
      const allText = Array.from(document.querySelectorAll('li.reusable-search__result-container, .artdeco-card')).map((el, idx) => {
        return {
          id: idx + 1,
          text: el.innerText.trim()
        };
      }).filter(x => x.text.length > 30);
      return allText;
    });

    console.log(`Extracted ${cards.length} search post cards.`);
    fs.writeFileSync('linkedin_posts_extracted.json', JSON.stringify(cards, null, 2));

    cards.forEach((c, i) => {
      console.log(`\n================ POST #${i+1} ================`);
      console.log(c.text.replace(/\n+/g, ' \n '));
    });

  } catch (err) {
    console.error(err.message);
  }
})();
