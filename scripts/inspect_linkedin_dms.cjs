const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    
    // Check if any LinkedIn page is already open
    let liPage = pages.find(p => p.url().includes('linkedin.com'));
    if (!liPage) {
      console.log('Opening LinkedIn Messaging...');
      liPage = await browser.newPage();
      await liPage.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    } else {
      console.log('Found existing LinkedIn page:', liPage.url());
      await liPage.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded', timeout: 30000 });
    }

    await new Promise(r => setTimeout(r, 4000));
    console.log('LinkedIn Messaging Page Title:', await liPage.title());

    // Search messages or inspect conversations list for "poornesh" and "i have a solution guys dont"
    const convos = await liPage.evaluate(() => {
      const items = Array.from(document.querySelectorAll('.msg-conversation-listitem, .msg-conversation-card, [data-view-name="message-thread-item"]'));
      return items.map(it => {
        const title = it.querySelector('.msg-conversation-listitem__participant-names, .msg-conversation-card__participant-names, h3')?.innerText?.trim();
        const snippet = it.querySelector('.msg-conversation-card__message-snippet, p')?.innerText?.trim();
        const link = it.querySelector('a')?.href;
        return { title, snippet, link };
      });
    });

    console.log('Found conversations in view:', JSON.stringify(convos, null, 2));

  } catch (err) {
    console.error('LinkedIn error:', err.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
