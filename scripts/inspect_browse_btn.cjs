const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  if (!deltekPage) return;

  const browseEl = await deltekPage.evaluate(() => {
    const all = Array.from(document.querySelectorAll('*'));
    const b = all.find(x => x.innerText && x.innerText.trim() === 'Browse');
    if (!b) return 'not found';
    return {
      tag: b.tagName,
      className: b.className,
      id: b.id,
      html: b.outerHTML,
      parentHtml: b.parentElement ? b.parentElement.outerHTML : ''
    };
  });

  console.log('Browse element:', JSON.stringify(browseEl, null, 2));
})();
