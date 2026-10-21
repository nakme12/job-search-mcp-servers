const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const p = pages.find(p => p.url().includes('my.oneforma.com/contributor/surveys/iframe'));
    const f = p.frames().find(frame => frame.url().includes('79371.aidaform.com'));

    const canvasInfo = await f.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      return canvases.map(c => {
        const rect = c.getBoundingClientRect();
        return {
          id: c.id,
          className: c.className,
          width: c.width,
          height: c.height,
          rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height },
          parentHtml: c.parentElement ? c.parentElement.outerHTML.substring(0, 300) : ''
        };
      });
    });

    console.log('Canvases in aidaform frame:', JSON.stringify(canvasInfo, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
