const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();

  // Find LinkedIn tab
  const liPage = pages.find(p => p.url().includes('linkedin.com'));
  if (!liPage) {
    console.log('NO_LINKEDIN_TAB');
    await browser.disconnect();
    process.exit(0);
  }

  console.log('LinkedIn tab found:', liPage.url());

  // Navigate to messaging
  try {
    await liPage.goto('https://www.linkedin.com/messaging/', { waitUntil: 'networkidle2', timeout: 20000 });
    await new Promise(r => setTimeout(r, 4000));
  } catch(e) {
    console.log('Navigation note:', e.message);
  }

  // Extract unread DMs
  const dms = await liPage.evaluate(() => {
    const conversations = document.querySelectorAll('.msg-conversation-listitem, [data-control-name="view_conversation"], .scaffold-layout__list-item');
    const results = [];
    conversations.forEach((el, i) => {
      if (i >= 20) return;
      const name = (
        el.querySelector('.msg-conversation-listitem__participant-names') ||
        el.querySelector('.conversation-item__title') ||
        el.querySelector('h3')
      )?.innerText?.trim();

      const preview = (
        el.querySelector('.msg-conversation-card__message-snippet') ||
        el.querySelector('.conversation-item__message-snippet') ||
        el.querySelector('.msg-conversation-listitem__message-snippet') ||
        el.querySelector('p')
      )?.innerText?.trim();

      const time = (
        el.querySelector('.msg-conversation-listitem__time-stamp') ||
        el.querySelector('time') ||
        el.querySelector('.timestamp')
      )?.innerText?.trim();

      const isUnread = el.classList.contains('msg-conversation-listitem--unread') ||
                       !!el.querySelector('.notification-badge') ||
                       !!el.querySelector('[data-test-is-unread="true"]');

      if (name) {
        results.push({
          name,
          preview: preview ? preview.substring(0, 120) : '',
          time: time || '',
          unread: isUnread
        });
      }
    });
    return results;
  });

  console.log('\n=== LINKEDIN DMs (Top 20) ===');
  if (dms.length === 0) {
    console.log('No DM threads found in DOM. Page may not have loaded properly.');
    // Try getting page title and URL
    const title = await liPage.title();
    console.log('Page title:', title);
    console.log('Page URL:', liPage.url());
  } else {
    dms.forEach((dm, i) => {
      const unreadFlag = dm.unread ? ' 🔴 UNREAD' : '';
      console.log(`[${i+1}] ${dm.name}${unreadFlag}`);
      console.log(`    Preview: ${dm.preview}`);
      console.log(`    Time: ${dm.time}`);
      console.log('');
    });
    const unreadCount = dms.filter(d => d.unread).length;
    console.log(`\nTotal threads: ${dms.length} | Unread: ${unreadCount}`);
  }

  await browser.disconnect();
})().catch(e => console.error('ERROR:', e.message));
