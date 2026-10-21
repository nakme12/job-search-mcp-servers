import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  
  await page.goto('https://www.linkedin.com/search/results/content/?keywords=React%20hiring%20resume%20India&sortBy=%22date_posted%22', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));

  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise(r => setTimeout(r, 2000));
    const count = await page.evaluate(() => Array.from(document.querySelectorAll('h2')).filter(h => h.innerText.trim() === 'Feed post').length);
    console.log(`Scroll ${i+1}: Feed posts count = ${count}`);
  }
  process.exit(0);
})();
