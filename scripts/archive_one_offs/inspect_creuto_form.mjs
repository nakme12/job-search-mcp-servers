import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Visiting Creuto apply page...');
    await p.goto('https://creuto.com/careers/apply?position=MERN%20Stack%20Developer&jobId=69fe315bab54fb2fca546108', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const formInfo = await p.evaluate(() => {
      const form = document.querySelector('form');
      return {
        title: document.title,
        hasForm: !!form,
        inputs: Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => ({
          tag: el.tagName,
          type: el.type,
          name: el.name,
          id: el.id,
          placeholder: el.placeholder,
          text: el.innerText
        }))
      };
    });
    console.log('Creuto apply form:', JSON.stringify(formInfo, null, 2));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
