import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Navigating to Zunderdog careers...');
    await p.goto('https://www.zunderdog.com/careers/junior-web-developer-fresher-pune?utm_source=adzuna&utm_medium=adzuna', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const info = await p.evaluate(() => {
      const applyLinks = Array.from(document.querySelectorAll('a, button')).filter(el => (el.innerText || '').toLowerCase().includes('apply'));
      return {
        title: document.title,
        applyLinks: applyLinks.map(a => ({ text: a.innerText, href: a.href || '' })),
        forms: document.querySelectorAll('form').length,
        bodySnippet: document.body.innerText.slice(0, 500)
      };
    });
    console.log('Zunderdog info:', JSON.stringify(info, null, 2));
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
