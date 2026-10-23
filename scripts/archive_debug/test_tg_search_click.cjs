const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) { console.log('No TG tab'); process.exit(1); }

  console.log('Focusing and clearing search input via DOM...');
  await tgPage.evaluate(() => {
    const el = document.getElementById('telegram-search-input');
    if (el) {
      el.focus();
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }
  });
  await new Promise(r => setTimeout(r, 400));

  console.log('Typing freshersvoice...');
  await tgPage.keyboard.type('freshersvoice', { delay: 50 });
  await new Promise(r => setTimeout(r, 1000));
  await tgPage.keyboard.press('Enter');
  await new Promise(r => setTimeout(r, 4500));

  // Find all elements containing 'freshersvoice' or 'Freshers Voice'
  const matchingItems = await tgPage.evaluate(() => {
    const list = Array.from(document.querySelectorAll('.ListItem, div[role="button"], a')).map(el => {
      const text = el.innerText ? el.innerText.trim() : '';
      return { text: text.replace(/\n/g, ' | '), tag: el.tagName };
    });
    return list.filter(item => item.text.toLowerCase().includes('freshersvoice') || item.text.toLowerCase().includes('freshers voice'));
  });

  console.log('Found matching search items:', matchingItems);

  // Click the best match
  const clicked = await tgPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.ListItem, div[role="button"]'));
    for (const el of items) {
      const t = el.innerText ? el.innerText.toLowerCase() : '';
      if (t.includes('freshers voice') || t.includes('freshersvoice')) {
        el.click();
        return el.innerText.substring(0, 80).replace(/\n/g, ' ');
      }
    }
    return null;
  });

  console.log('Clicked element:', clicked);
  await new Promise(r => setTimeout(r, 4000));

  // Check channel header to confirm we are in Freshers Voice
  const channelHeader = await tgPage.evaluate(() => {
    const h = document.querySelector('.chat-info, .top-header, .header-title, h3');
    return h ? h.innerText.replace(/\n/g, ' ').trim() : 'Header not found';
  });
  console.log('Active Channel Header:', channelHeader);

  // Extract messages from the channel
  const msgs = await tgPage.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll('.text-content, .message-content, div.text, .translatable-message'));
    return bubbles.map(b => b.innerText ? b.innerText.trim() : '').filter(Boolean);
  });

  console.log(`\nExtracted ${msgs.length} messages from channel!`);
  if (msgs.length > 0) {
    console.log('\n--- SAMPLE RECENT POST 1 ---');
    console.log(msgs[msgs.length - 1].substring(0, 300));
    console.log('\n--- SAMPLE RECENT POST 2 ---');
    console.log(msgs[msgs.length - 2].substring(0, 300));
  }

  await browser.disconnect();
})().catch(e => console.error(e.message));
