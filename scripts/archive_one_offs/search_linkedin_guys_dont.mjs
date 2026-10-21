import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/feed'));
  if (!liPage) {
    console.error('LinkedIn feed page not found');
    await browser.disconnect();
    return;
  }

  // Navigate to group/channel or search query
  console.log('Searching for "Guys Don\'t" on LinkedIn...');
  // Use existing tab quietly without popup
  await liPage.goto('https://www.linkedin.com/search/results/all/?keywords=Guys%20Don%27t&origin=GLOBAL_SEARCH_HEADER', { waitUntil: 'domcontentloaded', timeout: 30000 });

  const results = await liPage.evaluate(() => {
    const list = Array.from(document.querySelectorAll('div.entity-result, div[data-chameleon-result-urn]')).map(el => {
      const title = el.querySelector('.entity-result__title-text')?.innerText?.replace(/\n+/g, ' ') || '';
      const link = el.querySelector('a')?.href || '';
      const summary = el.querySelector('.entity-result__summary')?.innerText?.replace(/\n+/g, ' ') || '';
      return { title, link, summary };
    });
    return list;
  });

  console.log('Search results:', results.slice(0, 10));
  await browser.disconnect();
}

main().catch(console.error);
