const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('affirm'));

  const reactSelectContainer = await page.$('#country');
  const control = await reactSelectContainer.evaluateHandle(el => el.closest('.select__control') || el.closest('div[class*="control"]') || el.parentElement.parentElement);
  
  console.log('Clicking React-select control...');
  await control.click();
  await new Promise(r => setTimeout(r, 400));
  
  console.log('Typing India...');
  await page.keyboard.type('India', { delay: 100 });
  await new Promise(r => setTimeout(r, 800));

  console.log('Pressing Enter...');
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 400));

  const selectedText = await page.evaluate(() => {
    const el = document.getElementById('country');
    const container = el ? el.closest('.select__control') || el.parentElement.parentElement : null;
    return container ? container.innerText : 'null';
  });
  console.log('Selected Text in Country Control:', selectedText);

  browser.disconnect();
})();
