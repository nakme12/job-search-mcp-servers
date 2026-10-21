const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const homePage = pages.find(p => p.url().includes('mnjuser/homepage'));
  if (!homePage) {
    console.log('No homepage tab found.');
    return;
  }

  const cardDetails = await homePage.evaluate(() => {
    // Find elements containing "J S R Technologies" or "Unico Connect"
    const els = Array.from(document.querySelectorAll('*')).filter(e => {
      const t = e.innerText ? e.innerText.trim() : '';
      return t === 'J S R Technologies' || t === 'Unico Connect' || t === 'Midbrains';
    });

    return els.map(el => {
      // Find its clickable parent or anchor
      let cur = el;
      let hierarchy = [];
      for (let i = 0; i < 5; i++) {
        if (cur) {
          hierarchy.push({
            tag: cur.tagName,
            className: cur.className,
            hasClick: typeof cur.onclick === 'function' || cur.getAttribute('onclick') !== null,
            dataAttrs: Object.keys(cur.dataset || {})
          });
          cur = cur.parentElement;
        }
      }
      return {
        company: el.innerText,
        hierarchy
      };
    });
  });

  console.log('Card hierarchy details:\n', JSON.stringify(cardDetails, null, 2));
})();
