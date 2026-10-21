const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    const applyUrl = 'https://careers.cisco.com/global/en/hvhapply?jobSeqNo=CISCISGLOBAL2009166EXTERNALENGLOBAL';
    await page.goto(applyUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));
    
    const fileUpload = await page.evaluate(() => {
      const fi = document.querySelector('input[type="file"]');
      return fi ? { id: fi.id, name: fi.name } : null;
    });
    console.log('File upload element:', fileUpload);
    await page.close();
  } catch(e) {
    console.log('Error:', e.message);
  }
})();
