const puppeteer = require('puppeteer-core');

async function fillQuestions() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const p = pages[1];

  await p.evaluate(() => {
    // Current IT Specialization -> Web & Application Development
    const radioLabels = Array.from(document.querySelectorAll('label'));
    const webSpec = radioLabels.find(l => l.innerText.includes('Web & Application Development'));
    if (webSpec) webSpec.click();

    // City -> Indore
    const inputs = Array.from(document.querySelectorAll('input'));
    for (const inp of inputs) {
      const parent = inp.closest('.fb-dash-form-element') || inp.parentElement;
      const text = parent ? parent.innerText.toLowerCase() : '';

      if (text.includes('city') && !inp.value) {
        inp.value = 'Indore';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (text.includes('country') && !inp.value) {
        inp.value = 'India';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (text.includes('experience in years') && !inp.value) {
        inp.value = '2';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      } else if (text.includes('linkedin') && !inp.value) {
        inp.value = 'https://www.linkedin.com/in/pratik-patidar';
        inp.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }

    // Skills check
    for (const l of radioLabels) {
      const t = l.innerText.trim();
      if (['HTML', 'CSS', 'HTML5', 'Web Development', 'Full Stack Developer'].includes(t)) {
        const cb = l.querySelector('input[type="checkbox"]') || l;
        if (cb) cb.click();
      }
    }

    // Current Job Title dropdown
    const selects = Array.from(document.querySelectorAll('select'));
    for (const sel of selects) {
      if (sel.innerText.includes('Fresher') || sel.innerHTML.includes('Fresher')) {
        // pick closest match or option
        const opt = Array.from(sel.options).find(o => o.text.includes('Fresher') || o.text.includes('Developer'));
        if (opt) {
          sel.value = opt.value;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }
    }
  });

  await new Promise(r => setTimeout(r, 1500));

  // Inspect filled state
  const filledState = await p.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
      label: i.closest('.fb-dash-form-element')?.innerText?.split('\n')[0] || i.name || i.id,
      value: i.value,
      type: i.type,
      checked: i.checked
    })).filter(i => i.value || i.checked);
    return inputs;
  });

  console.log('Filled Screening Answers:\n', JSON.stringify(filledState, null, 2));
}

fillQuestions().catch(console.error);
