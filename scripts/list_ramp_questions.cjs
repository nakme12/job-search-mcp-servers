const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  const url = 'https://jobs.ashbyhq.com/ramp/4e64ab86-4e30-403b-b1b9-41dc052570ce/application';
  await p.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
  await new Promise(r => setTimeout(r, 3000));

  const questions = await p.evaluate(() => {
    const list = [];
    const labels = Array.from(document.querySelectorAll('label, fieldset, [role="radiogroup"]'));
    labels.forEach(l => {
      const t = l.innerText ? l.innerText.trim() : '';
      if (t.length > 5 && t.length < 250) list.push(t);
    });
    return list;
  });
  console.log('Ramp Questions:', JSON.stringify(questions, null, 2));

  await p.close();
  browser.disconnect();
})();
