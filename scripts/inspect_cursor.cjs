const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let p = pages.find(page => page.url().includes('cursor.com/careers'));
  if (!p) {
    console.log('No Cursor careers page found!');
    return;
  }
  console.log('Title:', await p.title());
  console.log('URL:', p.url());
  const details = await p.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const elements = Array.from(document.querySelectorAll('form, iframe, a, button')).map(el => ({
      tag: el.tagName,
      text: el.innerText ? el.innerText.trim() : '',
      href: el.getAttribute('href'),
      src: el.getAttribute('src')
    })).filter(e => {
      const t = (e.text + ' ' + (e.href || '') + ' ' + (e.src || '')).toLowerCase();
      return t.includes('apply') || t.includes('ashby') || t.includes('greenhouse') || t.includes('lever') || t.includes('mail');
    });
    return {
      snippet: text.slice(0, 1000),
      applyElements: elements
    };
  });
  console.log('Cursor details:\n', JSON.stringify(details, null, 2));
})();
