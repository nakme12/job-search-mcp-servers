const puppeteer = require('puppeteer-core');

async function checkJob(url) {
  const browser = await puppeteer.connect({
    browserURL: 'http://localhost:9222',
    defaultViewport: null
  });

  const page = await browser.newPage();
  console.log('Navigating to:', url);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 4000));

  const info = await page.evaluate(() => {
    const applyLink = Array.from(document.querySelectorAll('a, button')).find(el => {
      const t = (el.innerText || '').toLowerCase();
      return t.includes('apply on company website') || t.includes('apply');
    });
    return {
      title: document.title,
      applyText: applyLink ? applyLink.innerText : null,
      applyHref: applyLink ? applyLink.href : null
    };
  });

  console.log('Job Info:', info);
  process.exit(0);
}

const targetUrl = process.argv[2] || 'https://in.linkedin.com/jobs/view/frontend-engineer-at-headout-4474684900';
checkJob(targetUrl).catch(err => {
  console.error(err);
  process.exit(1);
});
