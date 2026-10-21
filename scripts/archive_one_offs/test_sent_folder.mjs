import puppeteer from 'puppeteer';

async function testSent() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const sentPage = pages.find(p => p.url().includes('mail.google.com/mail/u/1/#sent')) || pages.find(p => p.url().includes('mail.google.com'));
  
  await sentPage.bringToFront();
  await new Promise(r => setTimeout(r, 2000));
  
  const sentRows = await sentPage.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr.zA, tr[role="row"]'));
    return rows.slice(0, 10).map(r => {
      const recipient = r.querySelector('.yX, .zF, .bA4')?.innerText?.trim() || '';
      const subject = r.querySelector('.bog, .y6')?.innerText?.trim() || '';
      const snippet = r.querySelector('.y2')?.innerText?.trim() || '';
      const date = r.querySelector('.xW, .bq9')?.innerText?.trim() || '';
      return { recipient, subject, snippet, date };
    });
  });
  
  console.log('Recent Sent rows:', JSON.stringify(sentRows, null, 2));
  browser.disconnect();
}

testSent().catch(console.error);
