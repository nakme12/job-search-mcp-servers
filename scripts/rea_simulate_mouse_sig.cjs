const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().startsWith('https://79371.aidaform.com/atlantis'));

    const canvas = await page.$('canvas');
    const box = await canvas.boundingBox();
    console.log('Canvas bounding box:', box);

    // Scroll to canvas
    await page.evaluate(() => {
      document.querySelector('canvas').scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    await new Promise(r => setTimeout(r, 500));

    const startX = box.x + 50;
    const startY = box.y + box.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 30, startY - 20, { steps: 5 });
    await page.mouse.move(startX + 60, startY + 20, { steps: 5 });
    await page.mouse.move(startX + 90, startY - 10, { steps: 5 });
    await page.mouse.move(startX + 120, startY + 10, { steps: 5 });
    await page.mouse.move(startX + 150, startY, { steps: 5 });
    await page.mouse.up();

    console.log('Mouse signature simulated successfully');

    // Check if error feedback is visible
    const errDisplay = await page.evaluate(() => {
      const err = document.querySelector('.error-feedback');
      return err ? { text: err.innerText, display: err.style.display } : 'no err element';
    });
    console.log('Error feedback status:', errDisplay);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
