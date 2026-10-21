import puppeteer from 'puppeteer-core';

async function checkInbox() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  
  // 1. Gmail Check
  const gmail = pages.find(p => p.url().includes('mail.google.com'));
  let gmailResults = [];
  if (gmail) {
    gmailResults = await gmail.evaluate(() => {
      const items = [];
      const trs = document.querySelectorAll('tr[role="row"]');
      trs.forEach(tr => {
        const senderNode = tr.querySelector('[email]') || tr.querySelector('.yX') || tr.querySelector('.yP');
        const sender = senderNode ? (senderNode.getAttribute('email') || senderNode.textContent.trim()) : '';
        const subjectNode = tr.querySelector('.bog') || tr.querySelector('.y6');
        const subject = subjectNode ? subjectNode.textContent.trim() : '';
        const dateNode = tr.querySelector('.xW') || tr.querySelector('.bq4');
        const date = dateNode ? dateNode.textContent.trim() : '';
        if (subject || sender) {
          items.push({ sender, subject, date });
        }
      });
      return items.slice(0, 10);
    });
  }

  // 2. LinkedIn Notifications / Messages Check
  const linkedin = pages.find(p => p.url().includes('linkedin.com'));
  let liMessages = [];
  if (linkedin) {
    liMessages = await linkedin.evaluate(() => {
      const msgs = [];
      const msgThreads = document.querySelectorAll('.msg-conversation-listitem, .msg-conversation-card');
      msgThreads.forEach(t => {
        const name = t.querySelector('.msg-conversation-listitem__participant-names')?.textContent.trim() || '';
        const snippet = t.querySelector('.msg-overlay-list-bubble__message-snippet, .msg-conversation-card__message-snippet')?.textContent.trim() || '';
        if (name) msgs.push({ name, snippet });
      });
      return msgs.slice(0, 5);
    });
  }

  console.log('=== GMAIL INBOX RECENT (TOP 10) ===');
  console.log(JSON.stringify(gmailResults, null, 2));

  console.log('=== LINKEDIN ACTIVE CHATS / REPLIES ===');
  console.log(JSON.stringify(liMessages, null, 2));

  browser.disconnect();
}

checkInbox().catch(e => console.error(e.message));
