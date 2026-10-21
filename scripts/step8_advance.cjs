const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('rubricsacademy'));

  // Click run check
  const runBtn = await page.$('button.runcheck');
  if (runBtn) {
    const box = await runBtn.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await new Promise(r => setTimeout(r, 800));
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  }

  await new Promise(r => setTimeout(r, 2000));
  const fb = await page.evaluate(() => document.getElementById('fb')?.innerText || '');
  console.log('FEEDBACK:\n', fb);

  // Click nav-primary to advance
  await new Promise(r => setTimeout(r, 2500));
  const navBtn = await page.$('#nav-primary');
  if (navBtn) {
    const box = await navBtn.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await new Promise(r => setTimeout(r, 900));
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    }
  }

  await new Promise(r => setTimeout(r, 3000));
  const chip = await page.evaluate(() => document.getElementById('lesson-chip')?.innerText);
  console.log('NEW CHIP:', chip);
  const text = await page.evaluate(() => document.body.innerText.slice(0, 800));
  console.log('NEW TEXT:\n', text);

  browser.disconnect();
})().catch(e => console.error(e));
