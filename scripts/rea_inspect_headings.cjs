const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const oneformaPage = pages.find(p => p.url().includes('my.oneforma.com/contributor/surveys'));
    const frame = oneformaPage.frames().find(f => f.url().includes('aidaform.com'));

    const questions = await frame.evaluate(() => {
      // Find all heading or title elements preceding inputs
      const elements = Array.from(document.querySelectorAll('*'));
      const textBlocks = [];
      document.querySelectorAll('h1, h2, h3, h4, .text-xl, .text-lg, .font-bold, .title, p, label').forEach(el => {
        const txt = el.innerText.trim();
        if (txt && !textBlocks.includes(txt)) {
          textBlocks.push(txt);
        }
      });
      return textBlocks;
    });

    console.log(JSON.stringify(questions, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
