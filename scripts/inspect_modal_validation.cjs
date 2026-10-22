const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await b.newPage();
  await p.goto('https://www.placementindia.com/job-detail/react-developer-in-webcraftit-at-indore-1213250.htm');
  await new Promise(r => setTimeout(r, 2000));

  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('a, button')).find(x => (x.innerText || '').trim().toLowerCase() === 'apply');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2000));

  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(x => (x.innerText || x.value || '').trim().toLowerCase() === 'submit application');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 1500));

  const validation = await p.evaluate(() => {
    const errEls = Array.from(document.querySelectorAll('.error, .err, label[class*="error"], div[id*="error"], span[id*="error"]')).map(e => e.innerText.trim()).filter(Boolean);
    const visibleInputs = Array.from(document.querySelectorAll('input:not([type="hidden"]), select')).map(i => ({
      id: i.id,
      name: i.name,
      value: i.value,
      placeholder: i.placeholder,
      visible: i.offsetParent !== null
    })).filter(i => i.visible);
    return { errEls, visibleInputs };
  });

  console.log(JSON.stringify(validation, null, 2));
  await p.close();
  await b.disconnect();
})();
