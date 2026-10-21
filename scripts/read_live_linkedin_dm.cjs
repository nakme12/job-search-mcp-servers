const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
  if (!liPage) {
    console.log('NO_LINKEDIN_MESSAGING_TAB');
    await browser.disconnect();
    return;
  }
  const title = await liPage.title();
  const url = liPage.url();
  const info = await liPage.evaluate(() => {
    const listItems = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversations-container__convo-item')).map(el => el.innerText.replace(/\n+/g, ' | '));
    const activeThread = document.querySelector('.msg-thread')?.innerText || document.body.innerText.slice(0, 3000);
    return { listItems: listItems.slice(0, 15), activeThreadSnippet: activeThread.slice(0, 2000) };
  });
  console.log('TITLE:', title);
  console.log('URL:', url);
  console.log('CONVERSATIONS_LIST:', JSON.stringify(info.listItems, null, 2));
  console.log('\nACTIVE_THREAD_SNIPPET:\n', info.activeThreadSnippet);
  await browser.disconnect();
})().catch(console.error);
