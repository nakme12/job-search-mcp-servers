import puppeteer from 'puppeteer-core';

async function checkCustomSelects() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) return;

  const data = await page.evaluate(() => {
    // Find all custom dropdown trigger buttons / containers
    const buttons = Array.from(document.querySelectorAll('button, div[role="combobox"], div[role="listbox"]')).map(b => ({
      text: b.innerText.replace(/\n+/g, ' ').trim(),
      id: b.id,
      ariaExpanded: b.getAttribute('aria-expanded'),
      role: b.getAttribute('role')
    }));
    return buttons.slice(0, 20);
  });

  console.log(JSON.stringify(data, null, 2));
  await browser.disconnect();
}

checkCustomSelects().catch(console.error);
