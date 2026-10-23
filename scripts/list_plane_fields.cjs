const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function testCdpType() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('jobs.ashbyhq.com/plane')) || pages[0];
  
  await page.bringToFront();
  
  // Find all input elements inside the application form
  const fieldList = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input[type="text"], textarea')).map(el => {
      let cur = el;
      let labelText = '';
      for (let i = 0; i < 4; i++) {
        if (!cur) break;
        const l = cur.querySelector('label') || (cur.parentElement ? cur.parentElement.querySelector('label') : null);
        if (l) { labelText = l.innerText.trim(); break; }
        cur = cur.parentElement;
      }
      return {
        tag: el.tagName,
        name: el.name,
        val: el.value,
        label: labelText
      };
    });
  });

  console.log('Fields list:', JSON.stringify(fieldList, null, 2));
  await browser.disconnect();
}

testCdpType().catch(console.error);
