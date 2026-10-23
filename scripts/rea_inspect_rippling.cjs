const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function checkRipplingDOM() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let page = pages.find(p => p.url().includes('rippling.com'));
  if (!page) {
    page = await browser.newPage();
    await page.goto('https://ats.rippling.com/alaan-careers/jobs/5a84497e-6c95-4e99-8e42-279fef26e85c', { waitUntil: 'networkidle2' });
  }

  const dom = await page.evaluate(() => {
    const title = document.title;
    const bodyText = document.body ? document.body.innerText.replace(/\s+/g, ' ') : '';
    const buttons = Array.from(document.querySelectorAll('button, a')).map(b => b.innerText ? b.innerText.trim() : '').filter(t => t.length > 0 && t.length < 50);
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
      type: i.type,
      name: i.name,
      id: i.id,
      placeholder: i.placeholder,
      required: i.required
    }));
    return { title, bodySnippet: bodyText.slice(0, 500), buttons, inputs };
  });

  console.log('Rippling DOM State:');
  console.log(JSON.stringify(dom, null, 2));
  process.exit(0);
}

checkRipplingDOM().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
