const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  // Navigate to Drafts
  console.log('Navigating to drafts...');
  await p.goto('https://mail.google.com/mail/u/0/#drafts', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await new Promise(r => setTimeout(r, 3000));

  // Find draft row
  const draftRow = await p.$('tr.zA');
  if (draftRow) {
    console.log('Opening draft row...');
    await draftRow.click();
    await new Promise(r => setTimeout(r, 3000));

    // Verify what is inside the draft
    const details = await p.evaluate(() => {
      const subj = document.querySelector('input[name="subjectbox"]')?.value;
      const chips = Array.from(document.querySelectorAll('span[email], div[data-hovercard-id]')).map(c => c.getAttribute('email') || c.innerText);
      const body = document.querySelector('div[aria-label="Message Body"]')?.innerText;
      const hasAttachment = document.body.innerText.includes('Pratik Patidar Resume - Frontend Engineer.pdf');
      return { subj, chips, bodySnippet: body ? body.slice(0, 150) : '', hasAttachment };
    });

    console.log('Draft details in editor:', JSON.stringify(details, null, 2));

    // Now click Send and wait for "Message sent" toast or dialog close!
    console.log('Clicking Send button on the draft...');
    await p.evaluate(() => {
      const sendBtn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[aria-label*="Send"]');
      if (sendBtn) sendBtn.click();
    });

    // Wait for compose dialog to vanish
    console.log('Waiting for compose dialog to close...');
    await p.waitForFunction(() => !document.querySelector('div[role="dialog"]'), { timeout: 15000 });
    console.log('Compose dialog closed! Email is officially SENT.');

    await new Promise(r => setTimeout(r, 3000));

    // Now go to Sent and read top row
    await p.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded' });
    await new Promise(r => setTimeout(r, 4000));

    const topSent = await p.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('tr')).filter(r => r.innerText && r.innerText.trim().length > 5);
      return rows[0] ? rows[0].innerText.replace(/\n+/g, ' | ') : 'none';
    });
    console.log('TOP SENT ROW AFTER DELIVERY:\n', topSent);
  } else {
    console.log('No draft found');
  }

  b.disconnect();
})();
