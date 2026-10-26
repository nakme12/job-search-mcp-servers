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

  // Search using search input
  console.log('Focusing search box...');
  await p.evaluate(() => {
    const input = document.querySelector('input[aria-label="Search mail"], input[name="q"]');
    if (input) {
      input.value = 'Infosys';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const form = input.closest('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 4000));

  // Extract matching emails
  const rows = await p.evaluate(() => {
    const items = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
    return items.map((r, i) => {
      const sender = r.querySelector('.zF, .bA4, .yX, span[email]')?.innerText.trim() || '';
      const subject = r.querySelector('.bog, .bqe')?.innerText.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText.trim() || '';
      const date = r.querySelector('.xW, .m1')?.innerText.trim() || '';
      const isUnread = r.classList.contains('zE');
      return { idx: i, sender, subject, snippet, date, isUnread };
    });
  });

  console.log(`Matching rows for "Infosys": ${rows.length}`);
  const filtered = rows.filter(r => r.sender.toLowerCase().includes('infosys') || r.subject.toLowerCase().includes('infosys') || r.snippet.toLowerCase().includes('infosys'));
  console.log('Filtered exact Infosys rows:', JSON.stringify(filtered, null, 2));

  if (filtered.length > 0) {
    // Click first matching row
    const targetIdx = filtered[0].idx;
    await p.evaluate((idx) => {
      const items = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
      const row = items[idx];
      const link = row.querySelector('.bog') || row;
      link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
    }, targetIdx);

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

    console.log('=== INFOSYS EMAIL FULL DETAILS ===');
    console.log(JSON.stringify(emailData, null, 2));
  }

  b.disconnect();
})();
