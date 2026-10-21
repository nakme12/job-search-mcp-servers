const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('rubricsacademy'));

  if (!page) {
    console.log('Rubrics page not found');
    browser.disconnect();
    return;
  }

  console.log('Placing chips using native click-to-move pattern with human delays...');

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));
    const dropCrit = document.getElementById('drop-crit');
    const dropNon = document.getElementById('drop-non');
    const dropPool = document.getElementById('drop-pool');

    const requestIds = ['g1', 'g2', 'g3', 'g4'];
    const constraintIds = ['g5', 'g6', 'g7', 'g8'];

    // Move any placed chips back to pool first
    const placed = Array.from(document.querySelectorAll('#drop-crit .dnd2-chip, #drop-non .dnd2-chip'));
    for (const c of placed) {
      c.click();
      await sleep(300);
      if (dropPool) dropPool.click();
      await sleep(300);
    }

    // Move to Requests bucket
    for (const id of requestIds) {
      const chip = document.querySelector(`.dnd2-chip[data-id="${id}"]`);
      if (chip && dropCrit) {
        chip.click();
        await sleep(500 + Math.random() * 400);
        dropCrit.click();
        await sleep(600 + Math.random() * 500);
      }
    }

    // Move to Constraints bucket
    for (const id of constraintIds) {
      const chip = document.querySelector(`.dnd2-chip[data-id="${id}"]`);
      if (chip && dropNon) {
        chip.click();
        await sleep(500 + Math.random() * 400);
        dropNon.click();
        await sleep(600 + Math.random() * 500);
      }
    }
  });

  await new Promise(r => setTimeout(r, 2000));

  const navStatus = await page.evaluate(() => {
    const nav = document.getElementById('nav-primary');
    return {
      disabled: nav ? nav.disabled : true,
      title: nav ? nav.title : '',
      ariaLabel: nav ? nav.getAttribute('aria-label') : ''
    };
  });
  console.log('NAV STATUS:', navStatus);

  if (!navStatus.disabled) {
    console.log('Human hesitation before checking answers...');
    await new Promise(r => setTimeout(r, 2500));
    await page.evaluate(() => {
      const nav = document.getElementById('nav-primary');
      if (nav) nav.click();
    });
    console.log('Clicked Check answers!');

    await new Promise(r => setTimeout(r, 3000));
    // Click Continue to advance to Step 9
    await page.evaluate(() => {
      const nav = document.getElementById('nav-primary');
      if (nav) nav.click();
    });
    await new Promise(r => setTimeout(r, 2500));
    const newChip = await page.evaluate(() => document.getElementById('lesson-chip')?.innerText);
    console.log('ADVANCED TO CHIP:', newChip);
  }

  browser.disconnect();
})().catch(e => console.error(e));
