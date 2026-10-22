const puppeteer = require('puppeteer-core');
const fs = require('fs');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('mail.google.com'));
    if (!page) {
      console.log('No Gmail page');
      return;
    }
    await page.bringToFront();

    console.log('Clicking Reply button...');
    const clicked = await page.evaluate(() => {
      // Look for the Reply button at the bottom of the last message
      const btns = Array.from(document.querySelectorAll('button[aria-label="Reply"], div[role="button"][aria-label*="Reply"], span[role="link"]'));
      for (const b of btns) {
        if (b.getAttribute('aria-label') === 'Reply' || b.innerText.trim() === 'Reply') {
          b.click();
          return true;
        }
      }
      return false;
    });

    console.log('Clicked result:', clicked);
    await sleep(2000);

    // Check if compose box is now visible
    const composeInfo = await page.evaluate(() => {
      const editor = document.querySelector('div[aria-label="Message Body"], div[role="textbox"]');
      return editor ? { tag: editor.tagName, aria: editor.getAttribute('aria-label'), role: editor.getAttribute('role') } : null;
    });

    console.log('Compose box info:', composeInfo);

  } catch (e) {
    console.error(e);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
