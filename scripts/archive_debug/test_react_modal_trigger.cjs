const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://cutshort.io/profile/all-jobs?jobid=6a9bc516ee3b291074293ca3', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  const clickResult = await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Apply now');
    if (!btn) return { found: false };
    
    // Dispatch React synthetic events
    ['mousedown', 'mouseup', 'click'].forEach(eventType => {
      btn.dispatchEvent(new MouseEvent(eventType, { bubbles: true, cancelable: true, view: window }));
    });
    return { found: true };
  });

  console.log('Click result:', clickResult);
  await new Promise(r => setTimeout(r, 3000));

  const modalResult = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('div, section, form'));
    const modal = all.find(el => el.innerText && el.innerText.includes('Please verify your data before applying'));
    if (!modal) return null;
    return {
      text: modal.innerText.substring(0, 400).replace(/\s+/g, ' ')
    };
  });

  console.log('Modal Result:', modalResult);
  await page.close();
  browser.disconnect();
})();
