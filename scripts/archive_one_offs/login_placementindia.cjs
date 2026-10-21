const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    p.on('response', async res => {
      if (res.url().includes('seekerAuthController')) {
        console.log('Login Response:', res.status());
        try {
          console.log('Body:', await res.text());
        } catch(e){}
      }
    });

    console.log('Navigating to login page...');
    await p.goto('https://www.placementindia.com/job-search/login.php', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    // Type email
    await p.type('input#user_name, input[name="user_name"]', 'pratikpatidar7990@gmail.com');
    await p.evaluate(() => {
      const cont = Array.from(document.querySelectorAll('button, a, input[type="button"]')).find(b => (b.innerText || b.value || '').toLowerCase().includes('continue'));
      if (cont) cont.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    // Type password
    const pwdInput = await p.$('input#userPassword, input[type="password"]');
    if (pwdInput) {
      await pwdInput.type('Mmmmmm@1');
      console.log('Typed password');
      await p.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button, input[type="submit"]')).find(b => (b.innerText || b.value || '').toLowerCase().includes('login'));
        if (btn) btn.click();
      });
      console.log('Clicked login button, waiting 5s...');
      await new Promise(r => setTimeout(r, 5000));
      console.log('Current URL after login:', p.url());
      console.log('Title after login:', await p.title());
    }
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
