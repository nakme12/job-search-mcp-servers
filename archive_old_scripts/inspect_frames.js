import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('placementindia.com'));
    if (!page) {
      console.log('No placementindia page found');
      return;
    }

    // Inspect iframe or shadowRoot if any, or dump all inputs across frames
    const frames = page.frames();
    console.log('Frames count:', frames.length);
    for (let i = 0; i < frames.length; i++) {
      const f = frames[i];
      try {
        const inputs = await f.evaluate(() => {
          return Array.from(document.querySelectorAll('input, select')).map(el => ({
            tag: el.tagName,
            id: el.id,
            name: el.name,
            placeholder: el.placeholder,
            value: el.value,
            offsetParent: el.offsetParent !== null
          }));
        });
        if (inputs.length > 0) {
          console.log(`Frame ${i} (${f.url()}):`, JSON.stringify(inputs.filter(x => x.offsetParent), null, 2));
        }
      } catch (e) {
        console.log(`Frame ${i} error:`, e.message);
      }
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
