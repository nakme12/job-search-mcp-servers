import puppeteer from 'puppeteer-core';

async function listTabs() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  console.log(`Total Open Tabs in CDP: ${pages.length}`);
  for (let i = 0; i < pages.length; i++) {
    const p = pages[i];
    console.log(`Tab [${i}]: ${await p.title()} | ${p.url().slice(0, 80)}`);
  }
  await browser.disconnect();
}

listTabs().catch(console.error);
