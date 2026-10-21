const puppeteer = require('puppeteer-core');

async function inspectGmail() {
  const browser = await puppeteer.connect({
    browserURL: 'http://127.0.0.1:9222',
    defaultViewport: null
  });

  const pages = await browser.pages();
  let gmailPage = pages.find(p => p.url().includes('mail.google.com'));

  if (!gmailPage) {
    console.log('Gmail tab not found among pages, opening new tab...');
    gmailPage = await browser.newPage();
    await gmailPage.goto('https://mail.google.com/mail/u/0/#inbox', { waitUntil: 'networkidle2' });
  }

  await gmailPage.bringToFront();
  await gmailPage.waitForSelector('table.F.cf.zt, div[role="main"]', { timeout: 15000 }).catch(() => {});

  const emails = await gmailPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('div[role="main"] tr[role="row"]'));
    return rows.slice(0, 12).map((row, idx) => {
      const sendersEl = row.querySelector('.yX.xY .yW, span[name], .bA4');
      const sender = sendersEl ? sendersEl.innerText.trim() : '';

      const subjectEl = row.querySelector('.bog, .bqe');
      const subject = subjectEl ? subjectEl.innerText.trim() : '';

      const snippetEl = row.querySelector('.y2');
      const snippet = snippetEl ? snippetEl.innerText.trim() : '';

      const dateEl = row.querySelector('.xW.xY span, td.xW span');
      const date = dateEl ? dateEl.innerText.trim() : '';

      const isUnread = row.className.includes('zE');

      return { idx: idx + 1, sender, subject, snippet, date, isUnread };
    });
  });

  console.log('--- RECENT EMAILS (TOP 12) ---');
  for (const e of emails) {
    console.log(`[#${e.idx}] [${e.date}] ${e.unread ? 'UNREAD' : 'READ'} | Sender: "${e.sender}" | Subject: "${e.subject}"`);
    console.log(`    Snippet: ${e.snippet.substring(0, 100)}...`);
  }

  return emails;
}

inspectGmail().then(() => {
  process.exit(0);
}).catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
