const puppeteer = require('puppeteer-core');

(async () => {
  const b = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const pages = await b.pages();
  const popup = pages.find(p => p.url().includes('accounts.google.com'));
  if (popup) {
    console.log('Found popup:', popup.url());
    
    // Check elements
    const info = await popup.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(x => x.innerText && x.innerText.trim() === 'pratikpatidar7990@gmail.com');
      if (el) {
        let curr = el;
        const ancestry = [];
        while (curr && curr !== document.body) {
          ancestry.push({ tag: curr.tagName, role: curr.getAttribute('role'), jsaction: curr.getAttribute('jsaction'), dataEmail: curr.getAttribute('data-email') });
          curr = curr.parentElement;
        }
        
        let clickable = el;
        while (clickable && clickable !== document.body) {
          if (clickable.getAttribute('data-identifier') || clickable.getAttribute('role') === 'link' || clickable.getAttribute('jsaction') || clickable.tagName === 'LI') {
            break;
          }
          clickable = clickable.parentElement;
        }
        
        if (clickable) {
          clickable.scrollIntoView();
          const r = clickable.getBoundingClientRect();
          clickable.click();
          return { clicked: true, ancestry, rect: { x: r.x, y: r.y, w: r.width, h: r.height } };
        }
      }
      return { clicked: false };
    });

    console.log('Info:', JSON.stringify(info, null, 2));

    await new Promise(r => setTimeout(r, 6000));
    console.log('After click popup URL:', popup.url());
  }

  const pagesAfter = await b.pages();
  for (const p of pagesAfter) {
    if (p.url().includes('red-sag') || p.url().includes('accounts.google.com') || p.url().includes('firebaseapp')) {
      console.log('Active Tab:', p.url(), await p.title());
    }
  }

  b.disconnect();
})();
