const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function testRipplingClick() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('rippling.com'));
  if (!page) {
    console.log('Rippling page not found');
    process.exit(1);
  }

  console.log('Found Rippling page. Clicking Apply now...');
  const clicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const b = btns.find(x => x.innerText && x.innerText.trim().toLowerCase() === 'apply now');
    if (b) {
      b.click();
      return true;
    }
    return false;
  });
  console.log('Apply now button clicked:', clicked);

  await new Promise(r => setTimeout(r, 4000));

  const afterClick = await page.evaluate(() => {
    const allInputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
      type: i.type,
      name: i.name,
      id: i.id,
      placeholder: i.placeholder,
      required: i.required,
      label: i.labels && i.labels[0] ? i.labels[0].innerText : ''
    }));
    const buttons = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
    return { url: window.location.href, allInputs, buttons };
  });

  console.log('After Click DOM state:');
  console.log(JSON.stringify(afterClick, null, 2));
  process.exit(0);
}

testRipplingClick().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
