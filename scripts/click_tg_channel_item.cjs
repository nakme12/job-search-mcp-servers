const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) { console.log('No TG tab'); process.exit(1); }

  console.log('Finding coordinates of ListItem for freshersvoice...');
  const box = await tgPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.ListItem, div[role="button"]'));
    for (const el of items) {
      const text = el.innerText ? el.innerText.toLowerCase() : '';
      if (text.includes('freshersvoice') || text.includes('freshers voice')) {
        const r = el.getBoundingClientRect();
        return { x: r.x + r.width / 2, y: r.y + r.height / 2, text: el.innerText.substring(0, 80).replace(/\n/g, ' ') };
      }
    }
    return null;
  });

  if (box) {
    console.log('Clicking coordinates at:', box.x, box.y, 'Text:', box.text);
    await tgPage.mouse.click(box.x, box.y);
  } else {
    console.log('Box not found!');
  }
  await new Promise(r => setTimeout(r, 4500));

  // Check channel header
  const title = await tgPage.evaluate(() => {
    const h = document.querySelector('.top-header, .chat-info, h3, .header-title');
    return h ? h.innerText.replace(/\n/g, ' ') : 'NOT_FOUND';
  });
  console.log('Active Header Title:', title);

  // Check messages
  const msgs = await tgPage.evaluate(() => {
    const bubbles = Array.from(document.querySelectorAll('.text-content, .message-content, div.text, .translatable-message'));
    return bubbles.map(b => b.innerText ? b.innerText.trim() : '').filter(Boolean);
  });
  console.log('Messages extracted count:', msgs.length);
  if (msgs.length > 0) {
    console.log('\n--- REAL POST FROM CHANNEL ---');
    console.log(msgs[msgs.length - 1].substring(0, 300));
  }

  await browser.disconnect();
})().catch(e => console.error(e.message));
