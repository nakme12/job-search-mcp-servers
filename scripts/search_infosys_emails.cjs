const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const gmail = pages.find(p => p.url().includes('mail.google.com'));

  if (!gmail) {
    console.log('No Gmail page found');
    return;
  }

  // Check what search threads are in Gmail
  const threads = await gmail.evaluate(() => {
    const rows = Array.from(document.querySelectorAll('tr, .zA')).map(r => ({
      sender: r.querySelector('.zF, .bA4')?.innerText?.trim() || '',
      subject: r.querySelector('.bog, .bqe')?.innerText?.trim() || '',
      snippet: r.querySelector('.y2')?.innerText?.trim() || '',
      date: r.querySelector('.xW')?.innerText?.trim() || ''
    })).filter(r => r.subject || r.sender);
    return rows.slice(0, 10);
  });

  console.log('Gmail Search Results:');
  console.log(JSON.stringify(threads, null, 2));

  await browser.disconnect();
})();
