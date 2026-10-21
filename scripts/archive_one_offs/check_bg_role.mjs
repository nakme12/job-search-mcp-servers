import puppeteer from 'puppeteer-core';

async function checkBgRole() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) return;

  const data = await page.evaluate(() => {
    return {
      bg: document.getElementById('listbox-_r_27_-select')?.innerText?.replace(/\n+/g, ' | '),
      role: document.getElementById('listbox-_r_2d_-select')?.innerText?.replace(/\n+/g, ' | ')
    };
  });
  console.log('Background Options:', data.bg);
  console.log('Role Options:', data.role);
  await browser.disconnect();
}

checkBgRole().catch(console.error);
