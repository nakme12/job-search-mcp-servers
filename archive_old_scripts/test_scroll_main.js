import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  
  console.log('Testing scrolling on MAIN element:');
  for (let i = 0; i < 5; i++) {
    const res = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (main) {
        main.scrollTop = main.scrollHeight;
        return { scrollTop: main.scrollTop, scrollHeight: main.scrollHeight, feedPosts: Array.from(document.querySelectorAll('h2')).filter(h => h.innerText.trim() === 'Feed post').length };
      }
      return null;
    });
    console.log(`Scroll ${i+1}:`, res);
    await new Promise(r => setTimeout(r, 2000));
  }
  process.exit(0);
})();
