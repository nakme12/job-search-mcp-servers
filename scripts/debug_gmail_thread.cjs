const puppeteer = require('puppeteer-core');
const fs = require('fs');

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
    
    // Check elements
    const elements = await page.evaluate(() => {
      const els = Array.from(document.querySelectorAll('div, span, button, a'));
      const matches = [];
      for (const el of els) {
        const text = (el.innerText || '').trim();
        const aria = (el.getAttribute('aria-label') || '').trim();
        if (text === 'Reply' || aria.toLowerCase().includes('reply')) {
          matches.push({
            tag: el.tagName,
            text,
            aria,
            classes: el.className,
            rect: el.getBoundingClientRect()
          });
        }
      }
      return matches;
    });

    console.log('Found reply matches:', elements.length);
    elements.forEach((m, i) => console.log(`#${i}:`, m));

  } catch (e) {
    console.error(e);
  } finally {
    if (browser) await browser.disconnect();
  }
})();
