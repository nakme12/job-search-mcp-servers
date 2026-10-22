const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  await p.goto('https://www.placementindia.com/job-detail/mern-stack-developer-in-anvtech-at-surat-bardoli-surat-1361297.htm', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('a, button')).find(x => (x.innerText || '').trim().toLowerCase() === 'apply');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  const modalInfo = await p.evaluate(() => {
    const visibleElements = Array.from(document.querySelectorAll('.modal, .popup, .apply-popup, form, div[id*="popup"]')).filter(el => el.offsetParent !== null);
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).filter(i => i.offsetParent !== null).map(i => ({
      tag: i.tagName,
      id: i.id,
      name: i.name,
      value: i.value,
      type: i.type,
      placeholder: i.placeholder,
      label: i.closest('div')?.innerText?.substring(0, 50).replace(/\n/g, ' ')
    }));
    return { visibleElementsCount: visibleElements.length, inputs };
  });

  console.log(JSON.stringify(modalInfo, null, 2));
  await p.close();
  await b.disconnect();
})();
