const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const liPage = pages.find(p => p.url().includes('linkedin.com/messaging'));
    if (!liPage) {
      console.log('LinkedIn messaging page not found!');
      process.exit(0);
    }

    console.log('[LinkedIn] Attached to messaging tab.');

    // 1. Inspect conversation items
    const convoHandles = await liPage.$$('.msg-conversation-listitem, .msg-conversation-card');
    console.log(`Found ${convoHandles.length} conversation elements.`);

    // Find Poornesh conversation and click it
    let foundPoornesh = false;
    for (const ch of convoHandles) {
      const text = await liPage.evaluate(el => el.innerText, ch);
      if (text.includes('Poornesh Vishnole')) {
        console.log('[Poornesh] Clicking Poornesh conversation...');
        await ch.click();
        foundPoornesh = true;
        break;
      }
    }

    await new Promise(r => setTimeout(r, 3000));

    // Extract messages / shared posts from Poornesh conversation
    const poorneshData = await liPage.evaluate(() => {
      // Find participant profile link if available
      const profileLink = document.querySelector('.msg-thread__link-to-profile, a[href*="/in/"]')?.href;
      // Find shared posts or links
      const msgItems = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem'));
      const posts = [];
      for (const msg of msgItems) {
        const time = msg.querySelector('time')?.innerText?.trim();
        const text = msg.innerText;
        const links = Array.from(msg.querySelectorAll('a')).map(a => a.href);
        posts.push({ time, text: text.substring(0, 300), links });
      }
      return { profileLink, posts };
    });

    console.log('[Poornesh Data]:', JSON.stringify(poorneshData, null, 2));

    // 2. Find "Guys, don't ignore this group" conversation and click it
    const convoHandles2 = await liPage.$$('.msg-conversation-listitem, .msg-conversation-card');
    for (const ch of convoHandles2) {
      const text = await liPage.evaluate(el => el.innerText, ch);
      if (text.includes('Guys, don\'t ignore this group') || text.includes('Guys, don')) {
        console.log('[Group] Clicking "Guys, don\'t ignore" conversation...');
        await ch.click();
        break;
      }
    }

    await new Promise(r => setTimeout(r, 3000));

    // Extract messages / shared posts from Group conversation
    const groupData = await liPage.evaluate(() => {
      const msgItems = Array.from(document.querySelectorAll('.msg-s-message-list__event, .msg-s-event-listitem'));
      const posts = [];
      for (const msg of msgItems) {
        const time = msg.querySelector('time')?.innerText?.trim();
        const text = msg.innerText;
        const links = Array.from(msg.querySelectorAll('a')).map(a => a.href);
        posts.push({ time, text: text.substring(0, 400), links });
      }
      return posts;
    });

    console.log('[Group Data (last 10)]:');
    console.log(JSON.stringify(groupData.slice(-10), null, 2));

  } catch (err) {
    console.error('Extraction error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
