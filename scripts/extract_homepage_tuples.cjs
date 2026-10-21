const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const homePage = pages.find(p => p.url().includes('mnjuser/homepage'));
  if (!homePage) {
    console.log('No homepage tab found.');
    return;
  }

  const tuples = await homePage.evaluate(() => {
    const cards = Array.from(document.querySelectorAll('.cust-job-tuple'));
    return cards.map((c, idx) => {
      const text = c.innerText.replace(/\n+/g, ' | ');
      return {
        index: idx,
        text
      };
    });
  });

  console.log(`Found ${tuples.length} cust-job-tuple cards on homepage:\n`, JSON.stringify(tuples, null, 2));
})();
