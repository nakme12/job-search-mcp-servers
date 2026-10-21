import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const p = pages.find(x => x.url().includes('zunderdog.com'));
  if (!p) {
    console.log('No Zunderdog page found');
    await browser.disconnect();
    return;
  }

  console.log('Clicking city selector button...');
  const cityBtn = await p.$('button#currentCity');
  if (cityBtn) {
    await cityBtn.click();
    await new Promise(r => setTimeout(r, 1500));

    // Look for search input inside city popover
    const cityInput = await p.$('div[role="dialog"] input, div[role="listbox"] input, input[placeholder*="Search city"], input[placeholder*="city"]');
    if (cityInput) {
      console.log('Found city search input, typing Indore...');
      await cityInput.type('Indore', { delay: 30 });
      await new Promise(r => setTimeout(r, 1000));
      // Click first option
      await p.evaluate(() => {
        const opt = Array.from(document.querySelectorAll('[role="option"], div[class*="item"]')).find(el => el.innerText.toLowerCase().includes('indore'));
        if (opt) opt.click();
      });
    } else {
      console.log('Searching options directly...');
      await p.evaluate(() => {
        const opt = Array.from(document.querySelectorAll('[role="option"], div[class*="item"], button')).find(el => el.innerText.toLowerCase().includes('indore'));
        if (opt) opt.click();
      });
    }
  }

  await new Promise(r => setTimeout(r, 1500));

  const cityState = await p.evaluate(() => {
    const btn = document.querySelector('button#currentCity');
    return {
      btnText: btn ? btn.innerText : null
    };
  });

  console.log('Selected City:', cityState);
  await browser.disconnect();
})();
