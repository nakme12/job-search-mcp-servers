const puppeteer = require('puppeteer-core');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();
    await page.goto('https://www.linkedin.com/messaging/', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 3500));

    const convos = await page.$$('.msg-conversation-listitem, .msg-conversation-card');
    for (const c of convos) {
      const text = await page.evaluate(el => el.innerText, c);
      if (text.includes('Poornesh Vishnole')) {
        console.log('Found and clicking Poornesh thread...');
        await c.click();
        break;
      }
    }
    await new Promise(r => setTimeout(r, 2500));

    const profileUrl = await page.evaluate(() => {
      const allLinks = Array.from(document.querySelectorAll('a[href*="/in/"]'));
      const found = allLinks.find(a => a.innerText.includes('Poornesh') || (a.getAttribute('aria-label') || '').includes('Poornesh'));
      return found ? found.href : null;
    });

    console.log('Poornesh Profile URL:', profileUrl);

    if (profileUrl) {
      const cleanUrl = profileUrl.split('?')[0];
      const activityUrl = cleanUrl.replace(/\/+$/, '') + '/recent-activity/all/';
      console.log('Navigating to activity URL:', activityUrl);
      await page.goto(activityUrl, { waitUntil: 'domcontentloaded' });
      await new Promise(r => setTimeout(r, 4000));

      const posts = await page.evaluate(() => {
        const items = Array.from(document.querySelectorAll('.feed-shared-update-v2, .feed-shared-text, [data-view-name="feed-full-update"]'));
        return items.map(it => it.innerText.substring(0, 400).replace(/\n+/g, ' '));
      });

      console.log(`Found ${posts.length} posts on Poornesh's profile:`);
      posts.forEach((p, i) => console.log(`[Post #${i+1}]:`, p));
    }

    await page.close();
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    if (browser) await browser.disconnect();
    process.exit(0);
  }
})();
