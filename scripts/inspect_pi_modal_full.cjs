const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  await p.goto('https://www.placementindia.com/job-detail/react-js-developer-in-gloomshine-services-private-limited-at-sector-63-noida-1350158.htm', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await new Promise(r => setTimeout(r, 2000));

  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('a, button')).find(b => (b.innerText || '').trim().toLowerCase() === 'apply');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));

  const details = await p.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select, textarea')).map(i => ({
      id: i.id,
      name: i.name,
      type: i.type,
      placeholder: i.placeholder,
      label: i.closest('div') ? i.closest('div').innerText.substring(0, 40).replace(/\n/g, ' ') : ''
    }));
    const fileInputs = Array.from(document.querySelectorAll('input[type="file"]')).map(f => ({ id: f.id, name: f.name }));
    const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a')).filter(b => /submit|continue|apply|upload/i.test(b.innerText || b.value)).map(b => ({
      tag: b.tagName,
      text: (b.innerText || b.value || '').trim().replace(/\n/g, ' '),
      id: b.id
    }));
    return { inputs, fileInputs, buttons };
  });

  console.log(JSON.stringify(details, null, 2));
  await p.close();
  await b.disconnect();
})();
