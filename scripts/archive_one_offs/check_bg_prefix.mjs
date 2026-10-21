import puppeteer from 'puppeteer-core';

async function checkBgPrefix() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) return;

  const bg = await page.evaluate(() => {
    return document.getElementById('listbox-_r_27_-select')?.innerText?.slice(0, 300);
  });
  console.log('BG PREFIX:', bg);
  await browser.disconnect();
}

checkBgPrefix().catch(console.error);
