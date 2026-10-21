const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const p = pages.find(p => p.url().includes('my.oneforma.com/contributor/surveys/iframe'));
    const f = p.frames().find(frame => frame.url().includes('79371.aidaform.com'));

    const html = await f.evaluate(() => {
      // Find element containing "Signature"
      const all = Array.from(document.querySelectorAll('*'));
      const matches = all.filter(el => el.innerText && el.innerText.includes('Signature'));
      const last = matches[matches.length - 1];
      let p = last;
      for (let i = 0; i < 3 && p.parentElement; i++) {
        p = p.parentElement;
      }
      return p.outerHTML;
    });

    console.log('HTML around signature:\n', html);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
