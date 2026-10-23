const puppeteer = require('puppeteer-core');

async function inspectApplyModal() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.goto('https://wellfound.com/jobs/3833952-front-end-developer-reactjs', { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2500));
  
  await page.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Apply');
    if (btn) btn.click();
  });
  await new Promise(r => setTimeout(r, 2500));
  
  const modalText = await page.evaluate(() => {
    const modal = document.querySelector('[role="dialog"]') || document.querySelector('div[class*="modal"]') || document.querySelector('div[class*="Modal"]');
    return modal ? modal.innerText : 'NO_MODAL_FOUND';
  });
  console.log('Modal text:\n', modalText);
  await page.screenshot({ path: 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/wellfound_modal.png' });
  await page.close();
  await browser.disconnect();
}
inspectApplyModal().catch(console.error);
