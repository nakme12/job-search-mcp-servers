const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await b.newPage();
  console.log('Loading fresh Sent tab...');
  await p.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'networkidle2', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  const rows = await p.evaluate(() => {
    const trs = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]')).filter(r => r.innerText.trim().length > 5);
    return trs.slice(0, 5).map(r => r.innerText.replace(/\n+/g, ' | '));
  });

  console.log('Fresh Sent Tab Rows:\n', JSON.stringify(rows, null, 2));
  await p.close();
  b.disconnect();
})();
