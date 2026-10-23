const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const tgPage = pages.find(p => p.url().includes('web.telegram.org/a'));

  if (!tgPage) { console.log('No TG tab'); process.exit(1); }

  console.log('Dispatching React native value setter for freshersvoice...');
  const res = await tgPage.evaluate(() => {
    const el = document.getElementById('telegram-search-input');
    if (!el) return 'NO_EL';
    el.focus();
    const valueSetter = Object.getOwnPropertyDescriptor(el, 'value')?.set;
    const prototype = Object.getPrototypeOf(el);
    const prototypeValueSetter = Object.getOwnPropertyDescriptor(prototype, 'value')?.set;
    if (prototypeValueSetter) {
      prototypeValueSetter.call(el, 'freshersvoice');
    } else {
      el.value = 'freshersvoice';
    }
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return el.value;
  });

  console.log('Input value after React setter:', res);
  await new Promise(r => setTimeout(r, 4000));

  // Now check search results
  const items = await tgPage.evaluate(() => {
    return Array.from(document.querySelectorAll('.ListItem, .search-result, [role="button"]')).map(el => el.innerText ? el.innerText.trim().replace(/\n/g, ' | ') : '').filter(Boolean).slice(0, 10);
  });

  console.log('\nSearch Results Found:');
  items.forEach((it, i) => console.log(`[${i+1}] ${it.substring(0, 80)}`));

  await browser.disconnect();
})().catch(e => console.error(e.message));
