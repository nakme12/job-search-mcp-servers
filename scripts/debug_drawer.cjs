const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  const url = 'https://www.naukri.com/job-listings-web-developer-atlantic-publishers-distributors-noida-delhi-ncr-0-to-5-years-161026016360';
  try {
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));
    await p.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button, a')).find(x => (x.innerText||'').trim().toLowerCase() === 'apply');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 3000));
    const drawerInfo = await p.evaluate(() => {
      const allDivs = Array.from(document.querySelectorAll('div, form, section'));
      const drawer = allDivs.find(d => d.innerText && d.innerText.includes('How many years of experience do you have in Shopify'));
      if (!drawer) return 'Drawer not found';
      
      const elementsInside = Array.from(drawer.querySelectorAll('*')).map(el => ({
        tag: el.tagName,
        className: el.className,
        id: el.id,
        placeholder: el.placeholder,
        text: el.innerText ? el.innerText.trim().slice(0, 50) : null
      }));
      return elementsInside;
    });
    console.log('Elements inside drawer:', JSON.stringify(drawerInfo, null, 2));
  } finally {
    await p.close();
  }
})();
