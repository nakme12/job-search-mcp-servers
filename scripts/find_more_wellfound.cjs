const puppeteer = require('puppeteer-core');

async function findMoreWellfound() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://wellfound.com/jobs', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3500));
  
  const jobs = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('a[href*="/jobs/"]')).map(el => ({
      title: el.innerText.trim(),
      href: el.href
    })).filter(x => x.title && 
                    (x.title.toLowerCase().includes('frontend') || x.title.toLowerCase().includes('react')) && 
                    !x.title.toLowerCase().includes('senior') &&
                    !x.title.toLowerCase().includes('lead') &&
                    !x.title.toLowerCase().includes('staff'));
  });
  console.log('Fresh 0-2 YOE Wellfound roles count:', jobs.length);
  console.log(JSON.stringify(jobs.slice(0, 10), null, 2));
  await page.close();
  await browser.disconnect();
}
findMoreWellfound().catch(console.error);
