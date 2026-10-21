const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  
  if (!deltekPage) {
    console.log('No Brassring page found.');
    return;
  }

  const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\deltek_app_start.png';
  await deltekPage.screenshot({ path: ssPath, fullPage: true });
  console.log('Screenshot saved to:', ssPath);

  const btns = await deltekPage.evaluate(() => {
    return Array.from(document.querySelectorAll('button, a, input[type="button"], input[type="submit"]')).map(b => ({
      tag: b.tagName,
      id: b.id,
      text: (b.innerText || b.value || '').trim()
    })).filter(b => b.text.length > 0 && b.text.length < 50);
  });

  console.log('Buttons:', JSON.stringify(btns, null, 2));
})();
