import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  try {
    console.log('Navigating to Weekday AI job on Adzuna...');
    await p.goto('https://www.adzuna.in/details/5913885939?utm_medium=api&utm_source=22d4b243', { waitUntil: 'domcontentloaded', timeout: 25000 });
    const info = await p.evaluate(() => {
      const applyBtn = document.querySelector('a[href*="/land/ad/"], a.apply-btn, .action-btn');
      return {
        title: document.title,
        applyText: applyBtn ? applyBtn.innerText : null,
        applyHref: applyBtn ? applyBtn.href : null
      };
    });
    console.log('Adzuna details:', info);

    if (info.applyHref) {
      console.log('Following redirect to landing URL...');
      await p.goto(info.applyHref, { waitUntil: 'networkidle2', timeout: 30000 });
      const dest = await p.evaluate(() => ({ url: window.location.href, title: document.title, textSnippet: document.body.innerText.slice(0, 400) }));
      console.log('Final landing destination:', dest);
    }
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
