import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.adzuna.in/details/5913885939?utm_medium=api&utm_source=22d4b243', { waitUntil: 'networkidle2', timeout: 30000 });
    const links = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('a')).map(a => ({ text: a.innerText.trim(), href: a.href })).filter(l => l.text.toLowerCase().includes('apply') || l.href.includes('/land/ad/'));
    });
    console.log('Adzuna apply links:', links);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
