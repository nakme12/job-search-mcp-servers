import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('linkedin.com'));
  
  const scrollInfo = await page.evaluate(() => {
    // Find all elements with overflow-y scroll or auto or scrollHeight > clientHeight
    const all = Array.from(document.querySelectorAll('*'));
    const scrollables = all.filter(el => {
      const style = window.getComputedStyle(el);
      return (style.overflowY === 'auto' || style.overflowY === 'scroll') && el.scrollHeight > el.clientHeight;
    });

    // Check pagination buttons or "show more results" button
    const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText.trim()).filter(t => t.length > 0 && t.length < 50);

    return {
      windowHeight: window.innerHeight,
      bodyHeight: document.body.scrollHeight,
      scrollables: scrollables.map(s => ({
        tag: s.tagName,
        className: s.className,
        scrollHeight: s.scrollHeight,
        clientHeight: s.clientHeight
      })),
      buttonsSample: buttons.slice(0, 20)
    };
  });

  console.log(JSON.stringify(scrollInfo, null, 2));
  process.exit(0);
})();
