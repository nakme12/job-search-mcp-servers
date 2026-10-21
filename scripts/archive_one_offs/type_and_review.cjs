const puppeteer = require('puppeteer-core');

async function fixInputsAndReview() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  // Fill text inputs via focused keyboard typing
  const inputs = await p.$$('input[type="text"]');
  console.log('Found text inputs:', inputs.length);

  // Identify fields
  for (const inp of inputs) {
    const info = await p.evaluate(el => {
      const parent = el.closest('.fb-dash-form-element') || el.parentElement;
      return {
        label: (el.getAttribute('aria-label') || parent?.innerText || '').toLowerCase(),
        val: el.value
      };
    }, inp);

    if (info.label.includes('linkedin') || info.label.includes('profile url')) {
      console.log('Typing LinkedIn URL...');
      await inp.click({ clickCount: 3 });
      await inp.type('https://www.linkedin.com/in/pratik-patidar', { delay: 10 });
    } else if (info.label.includes('experience in years')) {
      console.log('Typing Experience: 2...');
      await inp.click({ clickCount: 3 });
      await inp.type('2', { delay: 10 });
    } else if (info.label.includes('city')) {
      console.log('Typing City: Indore...');
      await inp.click({ clickCount: 3 });
      await inp.type('Indore', { delay: 10 });
    } else if (info.label.includes('country')) {
      console.log('Typing Country: India...');
      await inp.click({ clickCount: 3 });
      await inp.type('India', { delay: 10 });
    }
  }

  // Click Web & Application Development radio
  await p.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('label'));
    const target = labels.find(l => l.innerText.includes('Web & Application Development'));
    if (target) target.click();
  });

  await new Promise(r => setTimeout(r, 1500));

  // Click Review button
  await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const revBtn = btns.find(b => b.innerText.trim() === 'Review' || b.getAttribute('aria-label')?.includes('Review'));
    if (revBtn) revBtn.click();
  });

  await new Promise(r => setTimeout(r, 2500));

  const state = await p.evaluate(() => {
    const text = document.body.innerText;
    const btns = Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).filter(Boolean);
    const hasSubmit = btns.some(b => b.toLowerCase().includes('submit'));
    const m = text.match(/(\d+\/\d+\s*pages?[\s\S]{0,1200})/i);
    return {
      hasSubmit,
      buttons: btns,
      snippet: m ? m[0] : text.substring(0, 1000)
    };
  });

  console.log('Final Form State Before Submit:\n', JSON.stringify(state, null, 2));
}

fixInputsAndReview().catch(console.error);
