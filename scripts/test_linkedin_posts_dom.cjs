const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('linkedin.com/feed'));
  if (p) {
    const res = await p.evaluate(() => {
      // Find all elements that look like a post card
      const articles = Array.from(document.querySelectorAll('article, [role="article"], [data-view-name*="feed"], [data-view-name*="post"]'));
      // Or find elements with follow buttons or like buttons
      const buttons = Array.from(document.querySelectorAll('button')).filter(btn => /like|comment|repost|send/i.test(btn.innerText));
      const postAncestors = buttons.map(btn => {
        let parent = btn.parentElement;
        while (parent && parent.tagName !== 'MAIN' && parent !== document.body) {
          if (parent.innerText && parent.innerText.length > 100 && parent.innerText.length < 3000) {
            return parent;
          }
          parent = parent.parentElement;
        }
        return null;
      }).filter(Boolean);

      const uniquePosts = Array.from(new Set(postAncestors));

      return {
        articlesCount: articles.length,
        likeButtonsCount: buttons.length,
        uniquePostCardsCount: uniquePosts.length,
        sampleTexts: uniquePosts.slice(0, 5).map(card => card.innerText.substring(0, 150).replace(/\n+/g, ' | '))
      };
    });
    console.log(JSON.stringify(res, null, 2));
  } else {
    console.log('No LinkedIn feed tab found');
  }
  await b.disconnect();
})();
