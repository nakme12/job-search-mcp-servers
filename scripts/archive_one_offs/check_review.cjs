const puppeteer = require('puppeteer-core');

async function checkReview() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const revBtn = btns.find(b => b.innerText.trim() === 'Review' || b.getAttribute('aria-label')?.includes('Review'));
    if (revBtn) revBtn.click();
  });

  await new Promise(r => setTimeout(r, 2500));

  const state = await p.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/(\d+\/\d+\s*pages?[\s\S]{0,1200})/i);
    const hasSubmit = !!Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit'));
    return {
      hasSubmit,
      snippet: m ? m[0] : text.substring(0, 1000)
    };
  });

  console.log('Review State:\n', JSON.stringify(state, null, 2));
}

checkReview().catch(console.error);
