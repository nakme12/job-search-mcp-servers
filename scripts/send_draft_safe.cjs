const puppeteer = require('puppeteer-core');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = (await b.pages()).find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  // If draft dialog is already open on screen
  let dialog = await p.$('div[role="dialog"]');
  if (!dialog) {
    console.log('Navigating to drafts and clicking row...');
    await p.goto('https://mail.google.com/mail/u/0/#drafts', { waitUntil: 'domcontentloaded' });
    await sleep(2500);
    await p.evaluate(() => {
      const row = document.querySelector('tr.zA');
      if (row) {
        const link = row.querySelector('.bog') || row;
        link.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
      }
    });
    await sleep(2500);
  }

  // Inspect dialog
  const details = await p.evaluate(() => {
    const subj = document.querySelector('input[name="subjectbox"]')?.value;
    const chips = Array.from(document.querySelectorAll('span[email], div[data-hovercard-id]')).map(c => c.getAttribute('email') || c.innerText);
    const body = document.querySelector('div[aria-label="Message Body"]')?.innerText;
    const hasAttachment = document.body.innerText.includes('Pratik Patidar Resume - Frontend Engineer.pdf');
    return { subj, chips, bodySnippet: body ? body.slice(0, 150) : '', hasAttachment };
  });

  console.log('Draft State in Editor:\n', JSON.stringify(details, null, 2));

  // Click Send button
  console.log('Clicking Send button...');
  await p.evaluate(() => {
    const sendBtn = document.querySelector('div[role="button"][data-tooltip*="Send"], div[aria-label*="Send"]');
    if (sendBtn) sendBtn.click();
  });

  console.log('Waiting 6s for delivery...');
  await sleep(6000);

  // Navigate to sent
  await p.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded' });
  await sleep(4000);

  const topRow = await p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr')).filter(r => r.innerText && r.innerText.trim().length > 5);
    return rows[0] ? rows[0].innerText.replace(/\n+/g, ' | ') : 'none';
  });

  console.log('=== SENT FOLDER PROOF ===\n', topRow);

  b.disconnect();
})();
