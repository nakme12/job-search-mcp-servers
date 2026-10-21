const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) { console.log('No TG tab'); process.exit(1); }

  const structure = await tgPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.ListItem, [role="button"]'));
    const target = items.find(el => (el.innerText || '').toLowerCase().includes('freshersvoice'));
    if (!target) return 'TARGET_NOT_FOUND';

    const children = Array.from(target.querySelectorAll('*')).map(c => ({
      tag: c.tagName,
      className: c.className,
      role: c.getAttribute('role')
    }));

    // Find any anchor <a> tag or div with ripple / button class
    const clickable = target.querySelector('.ListItem-button, a, div[role="button"], .ripple');

    return {
      targetClass: target.className,
      hasClickableChild: !!clickable,
      clickableClass: clickable ? clickable.className : 'NONE',
      text: target.innerText.replace(/\n/g, ' ')
    };
  });

  console.log('Result:', structure);

  // If clickable child exists, click it!
  const clicked = await tgPage.evaluate(() => {
    const items = Array.from(document.querySelectorAll('.ListItem, [role="button"]'));
    const target = items.find(el => (el.innerText || '').toLowerCase().includes('freshersvoice'));
    if (!target) return false;
    const btn = target.querySelector('.ListItem-button, div[role="button"], a') || target;
    btn.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true, view: window }));
    btn.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, view: window }));
    btn.click();
    return true;
  });

  console.log('Mouse events dispatched:', clicked);
  await new Promise(r => setTimeout(r, 4000));

  const header = await tgPage.evaluate(() => {
    const h = document.querySelector('.top-header, .chat-info, h3, .header-title');
    return h ? h.innerText.replace(/\n/g, ' ') : 'NOT_FOUND';
  });
  console.log('Active Header Title now:', header);

  await browser.disconnect();
})().catch(e => console.error(e.message));
