const puppeteer = require('puppeteer-core');

async function resolveDests() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const urls = [
    { name: 'Digital Links (India Remote React/Next)', url: 'https://www.adzuna.in/details/5929351034?utm_medium=api&utm_source=de296ef6' },
    { name: 'AimInfologics (Next.js & Node)', url: 'https://www.adzuna.in/details/5925630752?utm_medium=api&utm_source=de296ef6' },
    { name: 'Augusta Hitech (React & Node)', url: 'https://www.adzuna.in/details/5925631707?utm_medium=api&utm_source=de296ef6' }
  ];

  for (const item of urls) {
    const p = await browser.newPage();
    try {
      await p.goto(item.url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await new Promise(r => setTimeout(r, 2000));
      const dest = await p.evaluate(() => {
        const applyBtn = document.querySelector('a.apply-button') || document.querySelector('a[href*="redirect"]') || document.querySelector('a[data-aid="apply-button"]');
        return applyBtn ? applyBtn.href : window.location.href;
      });
      console.log(item.name, '-> Direct Apply Link:', dest);
      if (dest && dest.includes('redirect')) {
        await p.goto(dest, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r => setTimeout(r, 3000));
        console.log('   Final Destination URL:', p.url());
        console.log('   Final Title:', await p.title());
      }
    } catch (e) {
      console.log('Error for', item.name, ':', e.message);
    } finally {
      await p.close();
    }
  }
}

resolveDests().catch(console.error);
