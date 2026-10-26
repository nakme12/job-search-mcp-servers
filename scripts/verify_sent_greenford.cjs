const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const p = pages.find(x => x.url().includes('mail.google.com'));
  if (!p) {
    b.disconnect();
    return;
  }
  await p.bringToFront();

  // Click on "Sent" link in the left sidebar to physically open Sent folder
  console.log('Clicking on Sent link in left sidebar...');
  await p.evaluate(() => {
    const sentLink = Array.from(document.querySelectorAll('a[href*="#sent"], a[aria-label*="Sent"]')).find(a => a.innerText.includes('Sent') || a.getAttribute('aria-label')?.includes('Sent'));
    if (sentLink) sentLink.click();
  });

  await new Promise(r => setTimeout(r, 3500));

  const sentRows = await p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
    return rows.slice(0, 5).map(r => r.innerText.replace(/\n+/g, ' | '));
  });

  console.log('Sent folder actual top rows:\n', JSON.stringify(sentRows, null, 2));

  // Also check if Greenford thread shows sent reply
  await p.evaluate(() => {
    const input = document.querySelector('input[aria-label="Search mail"], input[name="q"]');
    if (input) {
      input.value = 'to:greenfordconstruction.co.uk';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      const form = input.closest('form');
      if (form) form.dispatchEvent(new Event('submit', { bubbles: true }));
    }
  });

  await new Promise(r => setTimeout(r, 3500));

  const searchResults = await p.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr[role="row"], tr.zA'));
    return rows.map(r => r.innerText.replace(/\n+/g, ' | '));
  });

  console.log('Search to:greenfordconstruction.co.uk results:\n', JSON.stringify(searchResults, null, 2));

  b.disconnect();
})();
