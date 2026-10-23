const puppeteer = require('puppeteer-core');
const fs = require('fs');

async function testChips() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const jobUrl = 'https://www.naukri.com/job-listings-ai-assisted-frontend-developer-bluewud-concepts-noida-1-to-3-years-221026034002';
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  await page.click('#apply-button');
  await new Promise(r => setTimeout(r, 3000));
  
  await page.evaluate(() => {
    const el = document.querySelector('.textArea');
    if (el) {
      el.focus();
      el.innerText = '1.5';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await page.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 3000));

  const chips = await page.evaluate(() => {
    const els = Array.from(document.querySelectorAll('*'));
    return els
      .filter(el => el.children.length === 0 && el.innerText && (el.innerText.trim() === 'Yes' || el.innerText.trim() === 'No' || el.innerText.includes('relocate')))
      .map(el => ({ tag: el.tagName, class: el.className, text: el.innerText.trim(), parentClass: el.parentElement ? el.parentElement.className : '' }));
  });
  console.log('Options found:', chips);
  await page.close();
  await browser.disconnect();
}
testChips().catch(console.error);
