import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.zunderdog.com/careers/junior-web-developer-fresher-pune?utm_source=adzuna&utm_medium=adzuna', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const formData = await p.evaluate(() => {
      const form = document.querySelector('form');
      if (!form) return null;
      return {
        action: form.action,
        method: form.method,
        inputs: Array.from(form.querySelectorAll('input, select, textarea, button')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          text: el.innerText
        }))
      };
    });
    console.log('Form details:', JSON.stringify(formData, null, 2));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
