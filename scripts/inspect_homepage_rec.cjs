const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const homePage = pages.find(p => p.url().includes('mnjuser/homepage'));
  if (!homePage) {
    console.log('No homepage tab found.');
    return;
  }

  console.log('Found homepage tab:', await homePage.title());

  const recData = await homePage.evaluate(() => {
    // Collect all links on page matching job-listings or inside recommended sections
    const allLinks = Array.from(document.querySelectorAll('a')).filter(a => a.href && a.href.includes('job-listings'));
    
    const jobs = [];
    const seen = new Set();

    for (const a of allLinks) {
      const cleanUrl = a.href.split('?')[0];
      if (seen.has(cleanUrl)) continue;
      seen.add(cleanUrl);

      // Get container card text
      let card = a.closest('div[class*="tuple"], div[class*="card"], li, article, div[class*="job"]') || a.parentElement;
      let text = card ? card.innerText.replace(/\n+/g, ' | ') : a.innerText;

      jobs.push({
        title: a.innerText.trim(),
        url: a.href,
        cardText: text.slice(0, 200)
      });
    }

    // Also look for section headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, span, div')).map(el => el.innerText ? el.innerText.trim() : '').filter(t => /recommended|jobs for you/i.test(t));

    return {
      totalFound: jobs.length,
      headings: headings.slice(0, 5),
      jobs: jobs.slice(0, 20)
    };
  });

  console.log('Homepage Recommended Data:\n', JSON.stringify(recData, null, 2));
})();
