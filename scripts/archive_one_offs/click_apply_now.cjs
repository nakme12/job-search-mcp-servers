const puppeteer = require('puppeteer-core');

async function clickApplyNow() {
  const res = await fetch('http://127.0.0.1:9222/json/version');
  const data = await res.json();
  const browser = await puppeteer.connect({ browserWSEndpoint: data.webSocketDebuggerUrl });
  const pages = await browser.pages();
  const dbTab = pages.find(p => p.url().includes('darwinbox.in'));

  console.log('Clicking "Apply Now" button on Sonata Darwinbox portal...');
  await dbTab.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const applyNow = btns.find(b => b.innerText.trim() === 'Apply Now');
    if (applyNow) applyNow.click();
  });

  await new Promise(r => setTimeout(r, 4000));

  const formState = await dbTab.evaluate(() => {
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
      tag: el.tagName,
      id: el.id,
      name: el.name,
      type: el.type,
      placeholder: el.placeholder,
      label: el.parentElement?.innerText?.substring(0, 50) || el.getAttribute('aria-label')
    }));

    return {
      inputsCount: inputs.length,
      inputs: inputs.slice(0, 15),
      snippet: document.body.innerText.substring(0, 400).replace(/\n+/g, ' ')
    };
  });

  console.log('Apply Form State:\n', JSON.stringify(formState, null, 2));
}

clickApplyNow().catch(console.error);
