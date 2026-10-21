import puppeteer from 'puppeteer-core';

async function checkRealSentFolder() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com'));
  if (!gmailPage) {
    console.log('No Gmail page found');
    return;
  }
  await gmailPage.bringToFront();

  // Find and click the Sent folder navigation link
  await gmailPage.evaluate(() => {
    const links = Array.from(document.querySelectorAll('a[href*="#sent"], a[aria-label*="Sent"]'));
    if (links.length > 0) links[0].click();
  });
  await new Promise(r => setTimeout(r, 4000));

  const items = await gmailPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr[role="row"]'));
    return rows.slice(0, 10).map(r => {
      const recipient = r.querySelector('span[email], span[name], .yP, .zF')?.innerText?.trim() || '';
      const subject = r.querySelector('.bog, span[data-thread-id]')?.innerText?.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText?.trim() || '';
      const time = r.querySelector('.xW, .bq3')?.innerText?.trim() || '';
      return { recipient, subject, snippet, time };
    });
  });

  console.log('TRUE_SENT_FOLDER_ITEMS:\n', JSON.stringify(items, null, 2));

  // Check draft or compose window
  const activeCompose = await gmailPage.evaluate(() => {
    const dialogs = document.querySelectorAll('div[role="dialog"]');
    return dialogs.length;
  });
  console.log('Active Open Compose Dialogs:', activeCompose);

  await gmailPage.screenshot({ path: 'screenshots/2026-10-12/live_gmail_view.png' });
}

checkRealSentFolder().catch(console.error);
