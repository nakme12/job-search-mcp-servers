const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) { console.log('No TG tab'); process.exit(1); }

  const items = await tgPage.evaluate(() => {
    const listItems = Array.from(document.querySelectorAll('.ListItem, .chatlist-chat, [role="button"]'));
    return listItems.map(el => el.innerText ? el.innerText.trim() : '').filter(Boolean);
  });

  console.log('Total list items found:', items.length);
  let matches = 0;
  items.forEach((item, i) => {
    const lower = item.toLowerCase();
    if (lower.includes('hiring') || lower.includes('developer') || lower.includes('stack') || lower.includes('jobs')) {
      matches++;
      console.log(`\n--- MATCH ${matches} ---`);
      console.log(item);
    }
  });

  if (matches === 0) {
    console.log('\nTop 5 list items:');
    items.slice(0, 5).forEach((item, i) => console.log(`[${i+1}] ${item.substring(0, 100)}`));
  }

  await browser.disconnect();
})().catch(e => console.error(e.message));
