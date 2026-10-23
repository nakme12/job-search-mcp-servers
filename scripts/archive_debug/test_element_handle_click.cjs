const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://cutshort.io/profile/all-jobs?jobid=6a9bc516ee3b291074293ca3', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  console.log('Finding Apply button element...');
  const btnHandle = await page.evaluateHandle(() => {
    return Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Apply now');
  });

  if (btnHandle) {
    console.log('Found button handle! Clicking via elementHandle.click()...');
    await btnHandle.click();
    await new Promise(r => setTimeout(r, 4000));
    
    const screenshotPath = 'cutshort_dialog_test.png';
    await page.screenshot({ path: screenshotPath });
    console.log('Saved dialog screenshot:', screenshotPath);
  } else {
    console.log('Apply now button handle not found!');
  }

  await page.close();
  browser.disconnect();
})();
