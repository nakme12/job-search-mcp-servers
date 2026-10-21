const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const homePage = pages.find(p => p.url().includes('mnjuser/homepage'));
  if (!homePage) {
    console.log('No homepage tab found.');
    return;
  }

  const items = await homePage.evaluate(() => {
    // Find the section that contains "Recommended jobs for you"
    const allDivs = Array.from(document.querySelectorAll('div, section'));
    const recSection = allDivs.find(d => {
      const h = d.querySelector('h1, h2, h3, h4, .heading, [class*="heading"], [class*="title"]');
      return h && /recommended jobs/i.test(h.innerText);
    });

    if (!recSection) return { error: 'recSection not found' };

    // Find all links or clickable items inside recSection
    const links = Array.from(recSection.querySelectorAll('a, [class*="item"], [class*="card"], li')).map(el => {
      const a = el.tagName === 'A' ? el : el.querySelector('a');
      return {
        tag: el.tagName,
        text: el.innerText ? el.innerText.trim().replace(/\n+/g, ' | ') : '',
        href: a ? a.href : null
      };
    }).filter(x => x.text && (x.href || x.text.includes('React') || x.text.includes('Developer')));

    return {
      sectionHtmlSnippet: recSection.outerHTML.slice(0, 1000),
      items: links
    };
  });

  console.log('Items in Recommended Section:\n', JSON.stringify(items, null, 2));
})();
