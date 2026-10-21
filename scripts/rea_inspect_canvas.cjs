const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const oneformaPage = pages.find(p => p.url().includes('my.oneforma.com/contributor/surveys'));
    const frame = oneformaPage.frames().find(f => f.url().includes('79371.aidaform.com'));

    const signatureDetails = await frame.evaluate(() => {
      const canvas = document.querySelector('canvas');
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      return {
        width: canvas.width,
        height: canvas.height,
        rect: {
          x: rect.x,
          y: rect.y,
          width: rect.width,
          height: rect.height
        },
        parent: canvas.parentElement ? canvas.parentElement.className : '',
        id: canvas.id
      };
    });

    console.log('Canvas details:', JSON.stringify(signatureDetails, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
