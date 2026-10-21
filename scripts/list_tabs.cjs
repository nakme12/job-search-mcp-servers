const puppeteer = require('puppeteer-core');

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  console.log('Total pages:', pages.length);
  for (let i = 0; i < pages.length; i++) {
    const title = await pages[i].title();
    console.log(i + ': ' + title + ' --> ' + pages[i].url());
  }
}

main().catch(console.error);
