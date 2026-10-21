import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://creuto.com/careers/apply?position=MERN%20Stack%20Developer&jobId=69fe315bab54fb2fca546108', { waitUntil: 'networkidle2', timeout: 30000 });
    const inputs = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('input, textarea, select')).map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute('aria-label'),
        id: el.id,
        className: el.className
      }));
    });
    console.log('Creuto inputs:', JSON.stringify(inputs, null, 2));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
