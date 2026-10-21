import puppeteer from 'puppeteer-core';

async function inspectPostClick() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('naukri.com')) || pages[0];

  const state = await page.evaluate(() => {
    return {
      currentUrl: window.location.href,
      dialogs: Array.from(document.querySelectorAll('div[class*="drawer"], div[class*="modal"], div[class*="dialog"], div[class*="chatbot"]')).map(d => d.innerText.trim().slice(0, 200)),
      btnText: document.querySelector('.apply-button, button[id*="apply"]')?.innerText?.trim(),
      toasts: Array.from(document.querySelectorAll('.toast, [class*="toast"], .server-err, .msg-box')).map(t => t.innerText.trim())
    };
  });

  console.log('Post Click Inspection:', JSON.stringify(state, null, 2));
  browser.disconnect();
}

inspectPostClick().catch(console.error);
