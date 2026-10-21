const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const oneformaPage = pages.find(p => p.url().includes('my.oneforma.com/contributor/surveys'));
    const frame = oneformaPage.frames().find(f => f.url().includes('79371.aidaform.com'));

    const questions = await frame.evaluate(() => {
      // Find all elements that look like question containers or titles
      const items = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      let node;
      while ((node = walker.nextNode())) {
        const val = node.nodeValue.trim();
        if (val) {
          items.push({
            text: val,
            tag: node.parentElement.tagName,
            cls: node.parentElement.className
          });
        }
      }
      return items;
    });

    console.log('Total text nodes:', questions.length);
    for (let i = 0; i < questions.length; i++) {
      console.log(`[${i}] <${questions[i].tag}> ${questions[i].text}`);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
