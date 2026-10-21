const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) return;

  const convos = await liPage.$$('.msg-conversation-listitem, .msg-conversations-container__convo-item');
  
  // Click on Keerti Chourasiya ([1])
  if (convos[1]) {
    await convos[1].click();
    await new Promise(r => setTimeout(r, 2000));
    const keertiThread = await liPage.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem')).map(m => m.innerText.trim()).filter(Boolean);
      return msgs.slice(-5);
    });
    console.log('=== KEERTI CHOURASIYA THREAD ===');
    console.log(keertiThread);
  }

  // Click on Disha Pushpad ([6])
  const freshConvos = await liPage.$$('.msg-conversation-listitem, .msg-conversations-container__convo-item');
  if (freshConvos[6]) {
    await freshConvos[6].click();
    await new Promise(r => setTimeout(r, 2000));
    const dishaThread = await liPage.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem')).map(m => m.innerText.trim()).filter(Boolean);
      return msgs.slice(-5);
    });
    console.log('\n=== DISHA PUSHPAD THREAD ===');
    console.log(dishaThread);
  }

  await browser.disconnect();
})().catch(console.error);
