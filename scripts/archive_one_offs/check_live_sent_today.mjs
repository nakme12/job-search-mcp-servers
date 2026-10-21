import puppeteer from 'puppeteer';

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const gmailPage = pages.find(p => p.url().includes('mail.google.com'));
  if (!gmailPage) {
    console.log('No Gmail page');
    process.exit(1);
  }

  await gmailPage.goto('https://mail.google.com/mail/u/1/#sent', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 4000));

  const sentRows = await gmailPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr[role="row"]'));
    return rows.slice(0, 8).map(r => {
      const recipient = r.querySelector('.yX, .bA4, .zF')?.innerText?.trim() || '';
      const subject = r.querySelector('.bog, .bqe')?.innerText?.trim() || '';
      const time = r.querySelector('.xW')?.innerText?.trim() || '';
      return { recipient, subject, time };
    });
  });

  console.log(JSON.stringify(sentRows, null, 2));
  await browser.disconnect();
}

main();
