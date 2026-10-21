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

    await p.type('#user_name', 'pratikpatidar7990@gmail.com');
    await p.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
      const cont = btns.find(b => (b.innerText || b.value || '').toLowerCase().includes('continue'));
      if (cont) cont.click();
    });
    await new Promise(r => setTimeout(r, 3000));

    const popups = await p.evaluate(() => {
      const allModals = Array.from(document.querySelectorAll('div, form')).filter(el => {
        const text = el.innerText || '';
        return (el.className.includes('popup') || el.className.includes('modal') || el.id.includes('popup')) && text.length > 5;
      });
      return allModals.map(m => ({
        id: m.id,
        className: m.className,
        styleDisplay: window.getComputedStyle(m).display,
        textSnippet: m.innerText.slice(0, 150)
      }));
    });
    console.log('Popups found:', popups);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
