import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  
  const parsed = await page.evaluate(() => {
    // Find all elements that contain an H2 with text "Feed post"
    const h2s = Array.from(document.querySelectorAll('h2')).filter(h => h.innerText.trim() === 'Feed post');
    return h2s.map(h2 => {
      const container = h2.closest('div.gfllid') || h2.parentElement;
      const fullText = container ? container.innerText : '';
      const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
      return {
        linesSnippet: lines.slice(0, 10),
        textLength: fullText.length
      };
    });
  });

  console.log(JSON.stringify(parsed, null, 2));
  process.exit(0);
})();
