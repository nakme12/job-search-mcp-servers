import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  
  const postInfo = await page.evaluate(() => {
    // Find elements containing 'Feed post'
    const all = Array.from(document.querySelectorAll('*'));
    const feedPosts = all.filter(el => {
      // Check if direct child has 'Feed post' or first text node
      return el.children.length > 0 && Array.from(el.children).some(c => (c.innerText || '').trim() === 'Feed post' || (c.getAttribute('aria-label') || '').includes('Feed post'));
    });
    return feedPosts.map(el => ({
      tag: el.tagName,
      className: el.className,
      id: el.id,
      textPreview: el.innerText.slice(0, 150)
    }));
  });

  console.log('Feed post containers:', postInfo);
  process.exit(0);
})();
