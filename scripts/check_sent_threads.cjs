const puppeteer = require('puppeteer-core');

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://mail.google.com/mail/u/0/#sent', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 4000));

  const threads = await page.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr[role="row"]'));
    return rows.slice(0, 10).map(r => r.innerText.replace(/\n+/g, ' | '));
  });

  console.log('Top Sent Threads (Count: ' + threads.length + '):');
  threads.forEach((t, i) => console.log((i + 1) + '. ' + t));

  await page.close();
}

main().catch(console.error);
