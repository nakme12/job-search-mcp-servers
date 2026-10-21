import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  
  for (let step = 0; step < 3; step++) {
    const clicked = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const loadMore = btns.find(b => (b.innerText || '').trim().toLowerCase() === 'load more');
      if (loadMore) {
        loadMore.click();
        return true;
      }
      return false;
    });
    console.log(`Step ${step+1}: Clicked load more:`, clicked);
    await new Promise(r => setTimeout(r, 3000));
    const count = await page.evaluate(() => Array.from(document.querySelectorAll('h2')).filter(h => h.innerText.trim() === 'Feed post').length);
    console.log(`Feed posts count: ${count}`);
  }
  process.exit(0);
})();
