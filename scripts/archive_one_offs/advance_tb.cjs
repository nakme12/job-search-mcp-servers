const puppeteer = require('puppeteer-core');

async function advanceForm() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  // Fill Phone and country code if needed
  await p.evaluate(() => {
    // Select India (+91)
    const selects = Array.from(document.querySelectorAll('select'));
    for (const sel of selects) {
      const opt = Array.from(sel.options).find(o => o.text.includes('+91') || o.text.includes('India'));
      if (opt) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Fill Phone
    const inputs = Array.from(document.querySelectorAll('input'));
    for (const inp of inputs) {
      const label = (inp.getAttribute('aria-label') || inp.parentElement?.innerText || '').toLowerCase();
      if ((label.includes('phone') || label.includes('mobile')) && !inp.value) {
        inp.value = '8269647990';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // Click Next
    const btns = Array.from(document.querySelectorAll('button'));
    const nextBtn = btns.find(b => b.innerText.trim() === 'Next' || b.getAttribute('aria-label')?.includes('Next'));
    if (nextBtn) nextBtn.click();
  });

  await new Promise(r => setTimeout(r, 2500));

  const state = await p.evaluate(() => {
    const text = document.body.innerText;
    const m = text.match(/(\d+\/\d+\s*pages?[\s\S]{0,600})/i);
    return {
      snippet: m ? m[0] : text.substring(0, 500)
    };
  });

  console.log('Next Page State:\n', state.snippet);
}

advanceForm().catch(console.error);
