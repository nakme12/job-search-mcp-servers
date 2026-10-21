const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const pratik = pages.find(p => p.url().includes('mail.google.com/mail/u/1'));

  if (!pratik) {
    console.log('Pratik tab not found');
    browser.disconnect();
    return;
  }

  // Click the Himangi email thread
  await pratik.evaluate(() => {
    const main = document.querySelector('div[role="main"]');
    const firstRow = main ? main.querySelector('tr[role="row"]') : null;
    if (firstRow) firstRow.click();
  });

  await new Promise(r => setTimeout(r, 4500));

  const details = await pratik.evaluate(() => {
    const main = document.querySelector('div[role="main"]');
    if (!main) return { err: 'no main' };
    const subject = document.querySelector('h2[data-thread-perm-id], .hP')?.innerText || '';
    const sender = document.querySelector('.gD')?.innerText || document.querySelector('.go')?.innerText || '';
    const emailAddr = document.querySelector('.gD')?.getAttribute('email') || '';
    const body = Array.from(document.querySelectorAll('.a3s')).map(b => b.innerText).join('\n---\n');
    return { subject, sender, emailAddr, body };
  });

  console.log('=======================================================');
  console.log(`📩 RECRUITER EMAIL DETAILS:`);
  console.log(`Subject: ${details.subject}`);
  console.log(`From: ${details.sender} <${details.emailAddr}>`);
  console.log(`\nEmail Content:\n${details.body}`);
  console.log('=======================================================');

  browser.disconnect();
})();
