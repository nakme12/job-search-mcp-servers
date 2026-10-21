import puppeteer from 'puppeteer-core';

async function inspectSentFolder() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com'));
  if (!gmailPage) {
    console.error('Gmail tab not found');
    return;
  }
  await gmailPage.bringToFront();
  
  // Navigate directly to Sent
  await gmailPage.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'domcontentloaded', timeout: 25000 });
  await new Promise(r => setTimeout(r, 4000));

  const sentRows = await gmailPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr[role="row"]'));
    return rows.slice(0, 8).map(r => {
      const recipient = r.querySelector('span[email], span[name], .yP, .zF')?.innerText?.trim() || '';
      const subject = r.querySelector('.bog, span[data-thread-id]')?.innerText?.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText?.trim() || '';
      const time = r.querySelector('.xW, .bq3')?.innerText?.trim() || '';
      const hasAttachment = !!r.querySelector('.brd, [aria-label*="Attachment"], [title*="Attachment"]');
      return { recipient, subject, snippet, time, hasAttachment };
    });
  });

  console.log('LIVE GMAIL SENT FOLDER AUDIT:\n', JSON.stringify(sentRows, null, 2));

  // Capture screenshot of Sent folder
  await gmailPage.screenshot({ path: 'screenshots/2026-10-12/sent_folder_live_verification.png' });
  console.log('Saved Sent folder screenshot proof.');
}

inspectSentFolder().catch(console.error);
