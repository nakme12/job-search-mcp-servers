const puppeteer = require('puppeteer-core');

async function checkVasudevJd() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages.find(page => page.url().includes('vasudev-technolabs'));

  const fullText = await p.evaluate(() => document.body.innerText);
  console.log('--- FULL VASUDEV JOB DESCRIPTION ---');
  console.log(fullText);

  const applyLink = await p.evaluate(() => {
    const a = Array.from(document.querySelectorAll('a')).find(el => el.innerText.trim() === 'Apply' || el.getAttribute('aria-label')?.includes('company website'));
    return a ? { text: a.innerText, href: a.href } : null;
  });

  console.log('Apply Link:', JSON.stringify(applyLink, null, 2));
}

checkVasudevJd().catch(console.error);
