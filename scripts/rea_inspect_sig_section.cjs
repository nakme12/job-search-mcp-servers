const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const oneformaPage = pages.find(p => p.url().includes('my.oneforma.com/contributor/surveys'));
    const frame = oneformaPage.frames().find(f => f.url().includes('79371.aidaform.com'));

    const sigSection = await frame.evaluate(() => {
      // Find element containing "Your Signature"
      const sigLabels = Array.from(document.querySelectorAll('*')).filter(el => el.innerText && el.innerText.includes('Your Signature'));
      const lastLabel = sigLabels[sigLabels.length - 1];
      const parent = lastLabel ? (lastLabel.closest('.af-element') || lastLabel.parentElement) : null;
      return {
        parentTag: parent ? parent.tagName : null,
        parentHtml: parent ? parent.outerHTML.substring(0, 1000) : null
      };
    });

    console.log('Signature section:', JSON.stringify(sigSection, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
