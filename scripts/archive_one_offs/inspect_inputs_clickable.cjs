const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await p.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a, button'));
      const apply = all.find(el => el.innerText && el.innerText.trim() === 'Apply');
      if (apply) apply.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    const inputsInfo = await p.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      return inputs.map(i => ({
        name: i.name,
        id: i.id,
        type: i.type,
        offsetParent: !!i.offsetParent,
        styleDisplay: window.getComputedStyle(i).display,
        styleVisibility: window.getComputedStyle(i).visibility
      })).filter(i => i.name.includes('user') || i.name === 'city');
    });
    console.log('Inputs info:', inputsInfo);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
