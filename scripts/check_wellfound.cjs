const puppeteer = require('puppeteer-core');

async function inspectWellfoundJobs() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://wellfound.com/jobs', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));
  
  const jobs = await page.evaluate(() => {
    const list = [];
    const elements = Array.from(document.querySelectorAll('a[href*="/jobs/"], button'));
    elements.forEach(el => {
      const text = el.innerText.trim();
      if (text.includes('Apply') || text.includes('Frontend') || text.includes('React')) {
        list.push({ text, tag: el.tagName, href: el.href || null, class: el.className });
      }
    });
    return list;
  });
  console.log('Wellfound interactive elements:\n', JSON.stringify(jobs.slice(0, 10), null, 2));
  await page.close();
  await browser.disconnect();
}
inspectWellfoundJobs().catch(console.error);
