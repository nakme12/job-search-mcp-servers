import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = (await browser.pages()).find(p => p.url().includes('web.telegram.org'));
    if (!page) {
      console.log('No TG page');
      return;
    }

    // Scroll up in the channel 5 times to load older posts from the last 3 days
    for (let i = 0; i < 5; i++) {
      await page.evaluate(() => {
        const messageList = document.querySelector('.MessageList, .messages-container, .bubbles');
        if (messageList) {
          messageList.scrollTop = messageList.scrollTop - 1500;
        } else {
          window.scrollBy(0, -1000);
        }
      });
      await new Promise(r => setTimeout(r, 1500));
    }

    await page.screenshot({ path: 'screenshots/2026-10-12/dev_hub_scrolled_up.png' });

    // Extract all posts with text
    const allPosts = await page.evaluate(() => {
      const bubbles = Array.from(document.querySelectorAll('.message, .Message, .bubble, .text-content'));
      return bubbles.map(b => b.innerText.trim()).filter(t => t.length > 20);
    });

    console.log(`Total posts loaded: ${allPosts.length}`);
    const uniquePosts = Array.from(new Set(allPosts));
    console.log(`Unique posts: ${uniquePosts.length}`);

    uniquePosts.forEach((post, i) => {
      console.log(`\n================ POST #${i+1} ================`);
      console.log(post);
    });

  } catch (err) {
    console.error(err.message);
  }
})();
