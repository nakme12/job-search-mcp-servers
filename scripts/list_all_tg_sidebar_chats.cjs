const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) { console.log('No TG tab'); process.exit(1); }

  const allChats = await tgPage.evaluate(() => {
    const list = Array.from(document.querySelectorAll('.chatlist-chat, .ListItem')).map(c => {
      const title = c.querySelector('.title, .user-title, h3')?.innerText?.trim();
      const lastMsg = c.querySelector('.last-message-summary, .subtitle, p')?.innerText?.trim();
      return { title, lastMsg: lastMsg ? lastMsg.substring(0, 120) : '' };
    }).filter(c => c.title);

    return list;
  });

  console.log('=== ALL JOINED CHATS / CHANNELS IN USER TELEGRAM ===');
  console.log(`Total found: ${allChats.length}`);
  allChats.forEach((c, i) => {
    console.log(`[${i+1}] ${c.title}`);
    if (c.lastMsg) console.log(`    Last: ${c.lastMsg}`);
  });

  await browser.disconnect();
})().catch(e => console.error(e.message));
