const puppeteer = require('puppeteer-core');

async function searchHirist() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://www.hirist.tech/c/react-js-jobs?exp=1-2', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3500));
  const jobs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/j/"]')).map(el => ({
      title: el.innerText.trim(),
      href: el.href
    })).filter(x => x.title.length > 5).slice(0, 10);
  });
  console.log('Hirist jobs found:', JSON.stringify(jobs, null, 2));
  await page.close();
  await browser.disconnect();
}
searchHirist().catch(console.error);
