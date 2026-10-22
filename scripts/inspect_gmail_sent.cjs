const puppeteer = require('puppeteer-core');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    const gmail = pages.find(p => p.url().includes('mail.google.com'));
    
    if (!gmail) {
      console.log('No Gmail page found');
      return;
    }
    
    console.log('Found Gmail URL:', gmail.url());
    console.log('Found Gmail Title:', await gmail.title());
    
    const info = await gmail.evaluate(() => {
      // Find all rows or tables or text
      const tables = Array.from(document.querySelectorAll('table'));
      const trs = Array.from(document.querySelectorAll('tr'));
      const divs = Array.from(document.querySelectorAll('div[role="main"]'));
      
      // Let's get text snippets of main
      const mainText = divs.length > 0 ? divs[0].innerText.slice(0, 3000) : document.body.innerText.slice(0, 3000);
      
      // Look for thread rows
      const threadRows = Array.from(document.querySelectorAll('tr[role="row"], div[role="row"], tr.zA'));
      const rowDetails = threadRows.map(r => r.innerText.replace(/\n+/g, ' | ').trim()).slice(0, 50);
      
      return {
        tableCount: tables.length,
        trCount: trs.length,
        threadRowCount: threadRows.length,
        sampleRows: rowDetails,
        mainPreview: mainText
      };
    });
    
    console.log('Thread rows count:', info.threadRowCount);
    console.log('Sample rows count:', info.sampleRows.length);
    if (info.sampleRows.length > 0) {
      info.sampleRows.forEach((r, idx) => console.log(`${idx + 1}. ${r}`));
    } else {
      console.log('Main text preview:\n', info.mainPreview.slice(0, 1000));
    }
  } catch (e) {
    console.error('Error:', e.message);
  }
})();
