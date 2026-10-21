const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = (await browser.pages())[0];
  const info = await page.evaluate(() => {
    const allLinks = Array.from(document.querySelectorAll('a, button')).map(el => ({
      tag: el.tagName,
      text: el.innerText.trim(),
      href: el.href || null,
      onclick: el.getAttribute('onclick') || null,
      target: el.getAttribute('target') || null,
      classes: el.className
    })).filter(x => x.text.length > 0 && x.text.length < 80);
    return allLinks;
  });
  console.log(JSON.stringify(info, null, 2));
  browser.disconnect();
})();
