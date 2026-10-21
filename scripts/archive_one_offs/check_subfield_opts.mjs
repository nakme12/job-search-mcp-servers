import puppeteer from 'puppeteer-core';

async function checkSubfieldOptions() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) return;

  const data = await page.evaluate(() => {
    const listbox = document.getElementById('listbox-_r_3n_');
    if (listbox) {
      return Array.from(listbox.querySelectorAll('[role="option"], li, div')).map(el => el.innerText.trim()).filter(Boolean);
    }
    // or try clicking the search input to open dropdown
    return 'listbox not visible yet';
  });

  console.log('Listbox state:', data);

  // Click input to open options
  const input = await page.$('input[id="_r_3n_"]');
  if (input) {
    await input.click();
    await new Promise(r => setTimeout(r, 1000));
    const openedOptions = await page.evaluate(() => {
      const opts = Array.from(document.querySelectorAll('[role="option"], [data-value]')).map(el => el.innerText.trim()).filter(Boolean);
      return Array.from(new Set(opts));
    });
    console.log('Opened Subfield Options:', openedOptions);
  }

  await browser.disconnect();
}

checkSubfieldOptions().catch(console.error);
