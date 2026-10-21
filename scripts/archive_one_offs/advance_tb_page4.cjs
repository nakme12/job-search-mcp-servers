const puppeteer = require('puppeteer-core');

async function advanceToPage4() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const nextBtn = btns.find(b => b.innerText.trim() === 'Next' || b.getAttribute('aria-label')?.includes('Next'));
    if (nextBtn) nextBtn.click();
  });

  await new Promise(r => setTimeout(r, 2500));

  const state = await p.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/(\d+\/\d+\s*pages?[\s\S]{0,1000})/i);
    return {
      snippet: m ? m[0] : text.substring(0, 800)
    };
  });

  console.log('Page 4/Next State:\n', state.snippet);
}

advanceToPage4().catch(console.error);
