const puppeteer = require('puppeteer-core');

async function fillAndReviewCleanly() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  await p.evaluate(() => {
    // 1. Radio: Web & Application Development
    const labels = Array.from(document.querySelectorAll('label'));
    const spec = labels.find(l => l.innerText.includes('Web & Application Development'));
    if (spec) spec.click();

    // 2. Select: Fresher
    const selects = Array.from(document.querySelectorAll('select'));
    for (const sel of selects) {
      const opt = Array.from(sel.options).find(o => o.text.includes('Fresher'));
      if (opt) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 3. Inputs: City, Country, Exp, LinkedIn
    const inputs = Array.from(document.querySelectorAll('input'));
    for (const inp of inputs) {
      const parent = inp.closest('.fb-dash-form-element') || inp.parentElement;
      const text = parent ? parent.innerText.toLowerCase() : '';

      if (text.includes('city')) {
        inp.value = 'Indore';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (text.includes('country')) {
        inp.value = 'India';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (text.includes('experience in years')) {
        inp.value = '2';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (text.includes('linkedin')) {
        inp.value = 'https://www.linkedin.com/in/pratik-patidar';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
        inp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    // 4. Skills: Check HTML, CSS, HTML5, Web Development
    for (const l of labels) {
      const t = l.innerText.trim();
      if (['HTML', 'CSS', 'HTML5', 'Web Development', 'Full Stack Developer'].includes(t)) {
        l.click();
      }
    }
  });

  await new Promise(r => setTimeout(r, 1500));

  // Click Review
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const rev = btns.find(b => b.innerText.trim() === 'Review');
    if (rev) rev.click();
  });

  await new Promise(r => setTimeout(r, 3000));

  const finalCheck = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
    const text = document.body.innerText;
    const hasSubmit = btns.some(b => b.toLowerCase().includes('submit'));
    const isError = text.includes('This field is required');
    return {
      hasSubmit,
      isError,
      buttons: btns,
      snippet: text.substring(0, 500)
    };
  });

  console.log('Result:\n', JSON.stringify(finalCheck, null, 2));
}

fillAndReviewCleanly().catch(console.error);
