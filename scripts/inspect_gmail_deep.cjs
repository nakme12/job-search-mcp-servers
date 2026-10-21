const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const gmail = pages.find(p => p.url().includes('mail.google.com'));
  if (!gmail) {
    console.log('Gmail tab not found');
    browser.disconnect();
    return;
  }

  const rows = await gmail.evaluate(() => {
    const list = Array.from(document.querySelectorAll('tr[role="row"]'));
    return list.slice(0, 30).map(r => {
      const senderEl = r.querySelector('.bDA, .yP, .zF, span[email]');
      const sender = senderEl ? senderEl.innerText.trim() : '';
      const subjectEl = r.querySelector('.bog, span.bqe');
      const subject = subjectEl ? subjectEl.innerText.trim() : '';
      const snippetEl = r.querySelector('.y2');
      const snippet = snippetEl ? snippetEl.innerText.trim() : '';
      const dateEl = r.querySelector('.xW');
      const date = dateEl ? dateEl.innerText.trim() : '';
      const isUnread = r.classList.contains('zE');
      return { sender, subject, snippet, date, isUnread };
    });
  });

  console.log(`Audited ${rows.length} rows in live Gmail inbox:`);
  rows.forEach((r, i) => {
    const status = r.isUnread ? '🔴 UNREAD' : '⚪ READ';
    console.log(`[${i + 1}] ${status} | From: ${r.sender} | Subject: ${r.subject} | Date: ${r.date}`);
    if (r.snippet) {
      console.log(`     Preview: ${r.snippet.slice(0, 100)}...`);
    }
  });

  browser.disconnect();
})();
