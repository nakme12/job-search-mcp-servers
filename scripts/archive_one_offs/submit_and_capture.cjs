const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function run() {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  console.log('Total pages:', pages.length);

  for (const page of pages) {
    const url = page.url();
    const title = await page.title();

    if (url.includes('solvebyte.com')) {
      console.log('Found Solvebyte:', url);
      // Check if button needs to be clicked or if already submitted
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('Solvebyte text snippet:', pageText.slice(0, 300));
      
      // If modal still open, let's see submit button
      const submitBtn = await page.$('button[type="submit"], input[type="submit"], form button');
      if (submitBtn) {
        console.log('Clicking Solvebyte submit button...');
        await submitBtn.click();
        await new Promise(r => setTimeout(r, 4000));
      }
      
      const postText = await page.evaluate(() => document.body.innerText);
      console.log('Solvebyte post click text:', postText.slice(0, 300));
      
      // Take full page screenshot
      const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/solvebyte_postsubmit.png';
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('Saved Solvebyte screenshot:', ssPath);
    }

    if (url.includes('anuyogsoftwares.com')) {
      console.log('Found Anuyog:', url);
      const pageText = await page.evaluate(() => document.body.innerText);
      console.log('Anuyog text snippet:', pageText.slice(0, 300));

      const submitBtn = await page.$('#apply button[type="submit"], #apply form button, form button[type="submit"]');
      if (submitBtn) {
        console.log('Clicking Anuyog submit button...');
        await submitBtn.click();
        await new Promise(r => setTimeout(r, 4000));
      }

      const postText = await page.evaluate(() => document.body.innerText);
      console.log('Anuyog post click text:', postText.slice(0, 300));

      const ssPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/anuyog_postsubmit.png';
      await page.screenshot({ path: ssPath, fullPage: true });
      console.log('Saved Anuyog screenshot:', ssPath);
    }
  }

  process.exit(0);
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
