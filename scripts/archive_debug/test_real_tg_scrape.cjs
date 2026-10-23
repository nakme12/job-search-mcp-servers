const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) { console.log('No TG tab'); process.exit(1); }

  console.log('Focusing search box...');
  await tgPage.evaluate(() => {
    const el = document.getElementById('telegram-search-input');
    if (el) { el.focus(); el.click(); }
  });
  await new Promise(r => setTimeout(r, 400));

  await tgPage.keyboard.down('Control');
  await tgPage.keyboard.press('A');
  await tgPage.keyboard.up('Control');
  await tgPage.keyboard.press('Backspace');
  await new Promise(r => setTimeout(r, 300));

  console.log('Typing offcampusjobs4u...');
  await tgPage.keyboard.type('offcampusjobs4u', { delay: 60 });
  await new Promise(r => setTimeout(r, 3500));

  // Check what search results appear in DOM
  const searchResults = await tgPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.search-result, .ListItem, div[role="button"]')).map(el => el.innerText ? el.innerText.trim() : '').filter(Boolean);
    return items.slice(0, 10);
  });

  console.log('Search Results Found:', searchResults);

  // Click the top result
  const clicked = await tgPage.evaluate(() => {
    const first = document.querySelector('.search-result, .ListItem[role="button"], .chatlist-chat');
    if (first) {
      first.click();
      return first.innerText ? first.innerText.substring(0, 80) : '';
    }
    return null;
  });

  console.log('Clicked Result:', clicked);
  await new Promise(r => setTimeout(r, 4000));

  // Extract all text from message container
  const conversationText = await tgPage.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll('.Message, .message-content, [class*="Message"], [class*="bubble"], div.text')).map(el => el.innerText ? el.innerText.trim() : '').filter(Boolean);
    return bubbles.slice(-10);
  });

  console.log('\n=== REAL CONVERSATION MESSAGES FROM CHANNEL ===');
  console.log('Total extracted:', conversationText.length);
  conversationText.forEach((m, i) => {
    console.log(`\n--- POST ${i+1} ---`);
    console.log(m.substring(0, 250));
  });

  await browser.disconnect();
})().catch(e => console.error('Error:', e.message));
