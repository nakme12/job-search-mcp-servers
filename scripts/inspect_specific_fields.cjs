const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let p = pages.find(page => page.url().includes('jobs.ashbyhq.com/supabase'));
  if (!p) {
    console.log('No Supabase page found.');
    return;
  }

  const details = await p.evaluate(() => {
    const res = [];
    const targets = ['Country of Residence', 'Github Profile', 'How would you describe', 'Rate your proficiency'];
    for (const t of targets) {
      const els = Array.from(document.querySelectorAll('*')).filter(el => {
        return el.children.length === 0 && el.innerText && el.innerText.includes(t);
      });
      res.push({
        target: t,
        matched: els.map(el => {
          let p = el.parentElement;
          return {
            tag: el.tagName,
            text: el.innerText,
            parentTag: p ? p.tagName : null,
            parentHtml: p ? p.outerHTML.slice(0, 300) : null
          };
        })
      });
    }
    return res;
  });

  console.log(JSON.stringify(details, null, 2));
})();
