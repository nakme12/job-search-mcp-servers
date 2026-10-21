const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(x => x.url().includes('naukri.com')) || pages[0];
  const url = 'https://www.naukri.com/job-listings-mern-stack-developer-jobaaj-com-pune-0-to-2-years-121026000824';
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));
  const res = await page.evaluate(() => {
    return {
      title: document.title,
      buttons: Array.from(document.querySelectorAll('button, a')).map(b => ({ tag: b.tagName, text: b.innerText.trim(), class: b.className, href: b.href })).filter(x => x.text.toLowerCase().includes('apply')),
      textSample: document.body.innerText.slice(0, 800)
    };
  });
  console.log(JSON.stringify(res, null, 2));
  browser.disconnect();
  process.exit(0);
})();
