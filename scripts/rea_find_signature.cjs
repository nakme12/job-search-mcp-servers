const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const page = pages.find(p => p.url().startsWith('https://79371.aidaform.com/atlantis'));

    const signatureInfo = await page.evaluate(() => {
      const canvases = Array.from(document.querySelectorAll('canvas'));
      const sigContainers = Array.from(document.querySelectorAll('*')).filter(el => el.innerText && el.innerText.includes('Your Signature'));
      return {
        canvases: canvases.map(c => ({
          id: c.id,
          cls: c.className,
          w: c.width,
          h: c.height,
          rect: c.getBoundingClientRect()
        })),
        sigContainerHtml: sigContainers.length > 0 ? sigContainers[sigContainers.length - 1].parentElement.parentElement.outerHTML : null
      };
    });

    console.log(JSON.stringify(signatureInfo, null, 2));
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
