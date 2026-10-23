const puppeteer = require('puppeteer-core');

async function testHumanClick() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane')) || pages[0];
  
  await page.bringToFront();
  
  await page.evaluate(() => {
    const btn = document.querySelector('.ashby-application-form-submit-button');
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });
  await new Promise(r => setTimeout(r, 1000));
  
  const submitBtn = await page.$('.ashby-application-form-submit-button');
  if (submitBtn) {
    const box = await submitBtn.boundingBox();
    console.log('Bounding box:', box);
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: 15 });
      await new Promise(r => setTimeout(r, 200));
      await page.mouse.down();
      await new Promise(r => setTimeout(r, 150));
      await page.mouse.up();
      console.log('Mouse clicked on submit button coordinate!');
    }
  }
  await new Promise(r => setTimeout(r, 4000));
  const snippet = await page.evaluate(() => document.body ? document.body.innerText.substring(0, 300).replace(/\n+/g, ' ') : '');
  console.log('DOM after mouse click:', snippet);
  await browser.disconnect();
}
testHumanClick().catch(console.error);
