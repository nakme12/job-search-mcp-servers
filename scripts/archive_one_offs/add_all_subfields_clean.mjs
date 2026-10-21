import puppeteer from 'puppeteer-core';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function addAllAvailableCS() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages()).find(p => p.url().includes('joinhandshake.com'));
  if (!page) {
    console.log('No page found');
    await browser.disconnect();
    return;
  }

  // The dropdown options available under Computer Science are:
  // 'Computer Programming', 'HTML', 'javascript', 'UX Design', 'Data Structures & Algorithms', 'Databases & Information Systems', 'python'
  const toSelect = [
    'HTML',
    'Computer Programming',
    'UX Design',
    'Data Structures & Algorithms',
    'Databases & Information Systems'
  ];

  console.log('Directly clicking available subfield tags in DOM...');
  for (const name of toSelect) {
    // 1. Focus input
    await page.evaluate(() => {
      const inp = document.getElementById('_r_3n_');
      if (inp) inp.focus();
    });
    await sleep(200);

    // 2. Click option from listbox
    const clicked = await page.evaluate((target) => {
      const listbox = document.getElementById('listbox-_r_3n_');
      if (listbox) {
        const opts = Array.from(listbox.querySelectorAll('[role="option"], li, div'));
        const found = opts.find(o => o.innerText && o.innerText.toLowerCase().trim() === target.toLowerCase().trim());
        if (found) {
          found.click();
          return true;
        }
      }
      return false;
    }, name);

    console.log(`Select '${name}':`, clicked ? 'SUCCESS' : 'NOT FOUND');
    await sleep(400);
  }

  await sleep(1000);
  await page.screenshot({ path: 'screenshots/2026-10-14_handshake_all_subfields_final.png' });
  console.log('Saved screenshot to screenshots/2026-10-14_handshake_all_subfields_final.png');

  await browser.disconnect();
}

addAllAvailableCS().catch(console.error);
