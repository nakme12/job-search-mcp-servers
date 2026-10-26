const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  console.log('Navigating directly to thread FMfcgzQhWxRtQsbWZkrjg...');
  await p.goto('https://mail.google.com/mail/u/0/#inbox/FMfcgzQhWxRtQsbWZkrjg', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 4000));

  const details = await p.evaluate(() => {
    const subject = document.querySelector('h2')?.innerText || '';
    const sender = document.querySelector('.gD')?.innerText || '';
    const senderEmail = document.querySelector('.gD')?.getAttribute('email') || '';
    const date = document.querySelector('.g3')?.getAttribute('title') || document.querySelector('.g3')?.innerText || '';
    const body = document.querySelector('.a3s')?.innerText || document.querySelector('div[role="main"]')?.innerText || '';
    const links = Array.from(document.querySelectorAll('div[role="main"] a')).map(a => ({ text: a.innerText.trim(), href: a.href }));
    return { subject, sender, senderEmail, date, body, links };
  });

  console.log('=== THREAD FMfcgzQhWxRtQsbWZkrjg DETAILS ===');
  console.log(JSON.stringify(details, null, 2));

  b.disconnect();
})();
