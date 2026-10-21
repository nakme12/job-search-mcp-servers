import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  
  const bottomElements = await page.evaluate(() => {
    const main = document.querySelector('main');
    if (!main) return 'No main';
    const all = Array.from(main.querySelectorAll('button, a, div[role="button"]'));
    return all.map(el => ({
      tag: el.tagName,
      text: el.innerText.trim(),
      ariaLabel: el.getAttribute('aria-label') || ''
    })).filter(x => x.text.length > 0);
  });

  console.log('Main interactive elements:', JSON.stringify(bottomElements.slice(-15), null, 2));
  process.exit(0);
})();
