const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('elevenlabs'));
  if (!page) {
    console.log('ElevenLabs page not found in CDP');
    process.exit(1);
  }

  const details = await page.evaluate(() => {
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).map(el => ({
      id: el.id,
      name: el.name,
      className: el.className,
      accept: el.accept
    }));
    return { url: window.location.href, fileInputs };
  });

  console.log('ElevenLabs Details:', JSON.stringify(details, null, 2));
  process.exit(0);
})();
