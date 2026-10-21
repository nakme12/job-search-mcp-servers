import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://jobspire.in/jobs/view/1253521?utm_source=adzuna&utm_medium=adzuna', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const links = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text.length > 0 && !l.href.includes('javascript'));
    });
    console.log('JobSpire links:', links);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
