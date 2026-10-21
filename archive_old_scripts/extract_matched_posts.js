import puppeteer from 'puppeteer-core';
import fs from 'fs';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
    if (!page) return;

    // Direct innerText of all visible post cards
    const postTexts = await page.evaluate(() => {
      // Find all elements containing '#Hiring' or 'hiring' or 'Looking for'
      const nodes = Array.from(document.querySelectorAll('*')).filter(el => {
        const t = el.innerText || '';
        return (t.includes('#Hiring') || t.includes('Hiring') || t.includes('hiring') || t.includes('looking for')) &&
               el.children.length > 2 && el.children.length < 20 &&
               t.length > 80 && t.length < 3000;
      });
      return nodes.map(n => n.innerText.trim());
    });

    const unique = Array.from(new Set(postTexts));
    console.log(`Matched ${unique.length} post nodes.`);
    fs.writeFileSync('linkedin_posts_matched.json', JSON.stringify(unique, null, 2));

    unique.slice(0, 10).forEach((t, i) => {
      console.log(`\n================ POST #${i+1} ================`);
      console.log(t.slice(0, 350));
    });

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
