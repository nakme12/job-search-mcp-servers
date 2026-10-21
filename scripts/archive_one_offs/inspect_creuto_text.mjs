import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://creuto.com/careers/apply?position=MERN%20Stack%20Developer&jobId=69fe315bab54fb2fca546108', { waitUntil: 'networkidle2', timeout: 30000 });
    const text = await p.evaluate(() => document.body.innerText);
    console.log('Creuto page text:', text.slice(0, 1000));
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
