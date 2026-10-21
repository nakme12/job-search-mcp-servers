import puppeteer from 'puppeteer-core';

async function reviewInbox() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com'));
  if (!gmailPage) {
    console.log('Gmail tab not found');
    return;
  }
  await gmailPage.bringToFront();
  
  // Click Inbox if not on inbox
  await gmailPage.evaluate(() => {
    const inboxLink = document.querySelector('a[href*="#inbox"]');
    if (inboxLink) inboxLink.click();
  });
  
  await new Promise(r => setTimeout(r, 3000));

  const emails = await gmailPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr[role="row"]'));
    return rows.slice(0, 15).map(r => {
      const sender = r.querySelector('span[email], span[name], .yP, .zF')?.innerText?.trim() || '';
      const subject = r.querySelector('.bog, span[data-thread-id]')?.innerText?.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText?.trim() || '';
      const date = r.querySelector('.xW, .bq3')?.innerText?.trim() || '';
      const isUnread = r.classList.contains('zE');
      return { sender, subject, snippet, date, isUnread };
    });
  });

  console.log('=== CYCLE 2 SLOT 1: GMAIL INBOX AUDIT ===');
  console.log(JSON.stringify(emails, null, 2));

  // Check for any recruiter replies or assessment invites
  const recruiterKeywords = ['interview', 'assessment', 'test', 'shortlist', 'schedule', 'opportunity', 'invitation', 'hr', 'hiring'];
  const importantEmails = emails.filter(e => {
    const text = (e.sender + ' ' + e.subject + ' ' + e.snippet).toLowerCase();
    return recruiterKeywords.some(kw => text.includes(kw));
  });

  console.log('\n=== FLAGGED RECRUITER / IMPORTANT EMAILS ===');
  console.log(JSON.stringify(importantEmails, null, 2));
}

reviewInbox().catch(console.error);
