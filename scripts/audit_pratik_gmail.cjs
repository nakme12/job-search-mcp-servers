const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const page = await browser.newPage();
  
  console.log('Navigating to Pratik Patidar (pratikpatidar7990@gmail.com)...');
  await page.goto('https://mail.google.com/mail/u/?authuser=pratikpatidar7990@gmail.com', { waitUntil: 'networkidle2', timeout: 30000 });
  
  const title = await page.title();
  const url = page.url();
  console.log(`Page Loaded: "${title}" at ${url}`);

  await new Promise(r => setTimeout(r, 3000));

  const rows = await page.evaluate(() => {
    const list = Array.from(document.querySelectorAll('tr[role="row"]'));
    return list.slice(0, 25).map(r => r.innerText.replace(/\n+/g, ' | '));
  });

  console.log(`\n=======================================================`);
  console.log(`📬 AUDITED PRATIK PATIDAR INBOX (${rows.length} Visible Rows)`);
  console.log(`=======================================================`);
  rows.forEach((r, i) => {
    console.log(`[${i + 1}] ${r}`);
  });
  console.log(`=======================================================`);

  // Close the old nakmeisiliya tab if it exists
  const allPages = await browser.pages();
  for (const p of allPages) {
    if (p !== page && p.url().includes('nakmeisiliya12@gmail.com')) {
      console.log(`Closing non-candidate Gmail tab: ${p.url()}`);
      await p.close();
    }
  }

  browser.disconnect();
})();
