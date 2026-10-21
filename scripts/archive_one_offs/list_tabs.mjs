import puppeteer from 'puppeteer-core';

async function listTabs() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  for (let i = 0; i < pages.length; i++) {
    const title = await pages[i].title();
    const url = pages[i].url();
    console.log(`Tab [${i}]: ${title} -> ${url}`);
  }
  browser.disconnect();
}

listTabs().catch(console.error);
