const puppeteer = require('puppeteer-core');

async function run() {
  const browser = await puppeteer.connect({ browserURL: 'http://localhost:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane'));
  if (!page) {
    console.log('Plane page not found');
    process.exit(0);
  }
  
  const inputs = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('input, textarea, select'));
    return list.map(el => {
      let p = el.parentElement;
      let label = '';
      while (p && p !== document.body) {
        if (p.querySelector('label') || p.innerText.length > 5) {
          label = p.innerText.slice(0, 100).replace(/\n/g, ' ');
          break;
        }
        p = p.parentElement;
      }
      return {
        tag: el.tagName,
        type: el.type,
        name: el.name,
        label: label
      };
    });
  });
  
  console.log(JSON.stringify(inputs, null, 2));
  process.exit(0);
}

run();
