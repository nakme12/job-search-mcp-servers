const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', protocolTimeout: 60000 });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  console.log('Searching for "Infosys" in Gmail...');
  await p.goto('https://mail.google.com/mail/u/0/#search/Infosys', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  const items = await p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
    return rows.map((r, i) => {
      const sender = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText.trim() || '';
      const subject = r.querySelector('.bog, .bqe')?.innerText.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText.trim() || '';
      const date = r.querySelector('.xW, .m1')?.innerText.trim() || '';
      const isUnread = r.classList.contains('zE');
      return { idx: i, sender, subject, snippet, date, isUnread };
    });
  });

  console.log(`Found ${items.length} emails matching "Infosys"`);
  console.log(JSON.stringify(items.slice(0, 5), null, 2));

  if (items.length > 0) {
    // Click on the most recent Infosys email
    await p.evaluate(() => {
      const row = document.querySelector('tr[role="row"], tr.zA');
      const target = row.querySelector('.bog') || row;
      target.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    });
    await new Promise(r => setTimeout(r, 3000));

    const emailData = await p.evaluate(() => {
      const subject = document.querySelector('h2.hP')?.innerText || '';
      const senderEl = document.querySelector('.gD');
      const senderName = senderEl?.innerText || '';
      const senderEmail = senderEl?.getAttribute('email') || '';
      const dateEl = document.querySelector('.g3');
      const date = dateEl?.getAttribute('title') || dateEl?.innerText || '';
      const body = document.querySelector('.a3s')?.innerText || '';
      return { subject, senderName, senderEmail, date, body };
    });

    console.log('=== LATEST INFOSYS EMAIL FULL DETAILS ===');
    console.log(JSON.stringify(emailData, null, 2));
  }

  b.disconnect();
})();
