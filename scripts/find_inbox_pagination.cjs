const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 3500));

  const paginationInfo = await p.evaluate(() => {
    // Look for all elements with aria-label containing "Older" or "newer" or role="button"
    const allButtons = Array.from(document.querySelectorAll('div, span, button')).filter(el => {
      const label = el.getAttribute('aria-label') || el.getAttribute('data-tooltip') || '';
      return label.toLowerCase().includes('older') || label.toLowerCase().includes('newer');
    }).map(el => ({
      tag: el.tagName,
      ariaLabel: el.getAttribute('aria-label'),
      dataTooltip: el.getAttribute('data-tooltip'),
      role: el.getAttribute('role'),
      classes: el.className
    }));

    return allButtons;
  });

  console.log('Inbox pagination buttons:', JSON.stringify(paginationInfo, null, 2));
  b.disconnect();
})();
