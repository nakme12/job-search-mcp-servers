const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await p.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a, button'));
      const apply = all.find(el => el.innerText && el.innerText.trim() === 'Apply');
      if (apply) apply.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    const popupVisible = await p.evaluate(() => {
      const u = document.querySelector('#user_name');
      const uCont = Array.from(document.querySelectorAll('button, a')).find(b => b.innerText && b.innerText.includes('Continue'));
      return {
        hasUserName: !!u,
        userNameVisible: u ? !!u.offsetParent : false,
        userNamePlaceholder: u ? u.placeholder : ''
      };
    });
    console.log('Step 1 status:', popupVisible);

    // If step 1 user_name is visible, let's type email and click continue
    if (popupVisible.userNameVisible) {
      await p.type('#user_name', 'pratikpatidar7990@gmail.com');
      await p.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
        const cont = btns.find(b => (b.innerText || b.value || '').toLowerCase().includes('continue'));
        if (cont) cont.click();
      });
      await new Promise(r => setTimeout(r, 3000));
      const step2 = await p.evaluate(() => {
        const fn = document.querySelector('input[name="userFullName"]');
        return {
          fnVisible: fn ? !!fn.offsetParent : false,
          bodySnippet: document.body.innerText.substring(0, 400)
        };
      });
      console.log('Step 2 status:', step2);
    }
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
