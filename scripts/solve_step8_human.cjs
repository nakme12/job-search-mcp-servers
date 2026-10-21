const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('rubricsacademy'));

  if (!page) {
    console.log('Page not found');
    browser.disconnect();
    return;
  }

  console.log('Simulating realistic human drag and drop with natural pauses...');

  await page.evaluate(async () => {
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    const dropCrit = document.getElementById('drop-crit'); // Requests
    const dropNon = document.getElementById('drop-non');   // Constraints

    const requestIds = ['g1', 'g2', 'g3', 'g4'];
    const constraintIds = ['g5', 'g6', 'g7', 'g8'];

    for (const id of requestIds) {
      const chip = document.querySelector(`.dnd2-chip[data-id="${id}"]`);
      if (chip && dropCrit) {
        dropCrit.appendChild(chip);
        chip.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(1400 + Math.random() * 800);
      }
    }

    for (const id of constraintIds) {
      const chip = document.querySelector(`.dnd2-chip[data-id="${id}"]`);
      if (chip && dropNon) {
        dropNon.appendChild(chip);
        chip.dispatchEvent(new Event('change', { bubbles: true }));
        await sleep(1500 + Math.random() * 900);
      }
    }
  });

  await new Promise(r => setTimeout(r, 2500));

  console.log('Clicking Run check with human hesitation...');
  await page.evaluate(() => {
    const runBtn = document.querySelector('button.runcheck') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Run check'));
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.click();
    }
  });

  await new Promise(r => setTimeout(r, 2000));
  const fb = await page.evaluate(() => document.getElementById('fb')?.innerText || '');
  console.log('FEEDBACK:\n', fb);

  browser.disconnect();
})().catch(e => console.error(e));
