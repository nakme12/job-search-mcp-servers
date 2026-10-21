const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com'));

  if (!liPage) { console.log('NO_LINKEDIN_TAB'); await browser.disconnect(); return; }

  // Make sure we're on messaging
  if (!liPage.url().includes('/messaging')) {
    await liPage.goto('https://www.linkedin.com/messaging/', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));
  }

  // Extract ALL conversation threads with full detail
  const dms = await liPage.evaluate(() => {
    const threads = document.querySelectorAll('.msg-conversation-listitem');
    const results = [];

    threads.forEach((el, i) => {
      const name = el.querySelector('.msg-conversation-listitem__participant-names')?.innerText?.trim();
      const preview = el.querySelector('.msg-conversation-listitem__message-snippet')?.innerText?.trim();
      const time = el.querySelector('.msg-conversation-listitem__time-stamp')?.innerText?.trim();
      const isUnread = el.classList.contains('msg-conversation-listitem--unread');
      const threadId = el.querySelector('[href*="/messaging/thread/"]')?.getAttribute('href') || '';

      if (name) {
        results.push({
          index: i,
          name,
          preview: preview || '',
          time: time || '',
          unread: isUnread,
          href: threadId
        });
      }
    });
    return results;
  });

  console.log(`\n📨 TOTAL DM THREADS FOUND: ${dms.length}`);
  console.log('='.repeat(60));

  dms.forEach((dm, i) => {
    const flag = dm.unread ? '🔴 UNREAD' : '     ';
    const sentByMe = dm.preview.startsWith('You:') || dm.preview.startsWith('You sent');
    const replyFlag = sentByMe ? '⬆️ (last msg was mine)' : '💬 NEEDS REPLY';
    console.log(`[${i+1}] ${flag} | ${dm.name}`);
    console.log(`      Preview: ${dm.preview.substring(0, 100)}`);
    console.log(`      Time: ${dm.time} | ${replyFlag}`);
    console.log(`      Link: ${dm.href}`);
    console.log('');
  });

  const needsReply = dms.filter(d => !d.preview.startsWith('You:') && !d.preview.startsWith('You sent') && d.name && !d.name.toLowerCase().includes('poornesh'));
  console.log(`\n🎯 THREADS NEEDING REPLY (excl. Poornesh): ${needsReply.length}`);
  needsReply.forEach(d => console.log(`  - ${d.name}: "${d.preview.substring(0, 80)}"`));

  await browser.disconnect();
})().catch(e => console.error('ERROR:', e.message));
