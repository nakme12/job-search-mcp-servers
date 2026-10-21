const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com/mail/u/1/'));
  if (!gmailPage) {
    console.log('NO_GMAIL_PAGE');
    await browser.disconnect();
    return;
  }

  await gmailPage.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'networkidle2', timeout: 25000 });
  await new Promise(r => setTimeout(r, 3000));

  const sentList = await gmailPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div[role="main"] tr[role="row"]'));
    return rows.slice(0, 15).map(r => r.innerText.replace(/\n+/g, ' | '));
  });

  console.log('SENT_LIST_TOTAL:', sentList.length);
  sentList.forEach((s, idx) => console.log(`[${idx + 1}] ${s}`));

  await browser.disconnect();
})().catch(console.error);
