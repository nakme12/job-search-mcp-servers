const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  
  if (!deltekPage) {
    console.log('No Brassring page found.');
    return;
  }

  console.log('Clicking "Let\'s get started"...');
  await deltekPage.evaluate(() => {
    const btn = document.getElementById('startapply') || Array.from(document.querySelectorAll('button')).find(b => /get started/i.test(b.innerText));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 5000));

  const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\deltek_step1.png';
  await deltekPage.screenshot({ path: ssPath, fullPage: true });
  console.log('Step 1 screenshot saved to:', ssPath);

  const stepInfo = await deltekPage.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const inputs = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
      tag: el.tagName,
      type: el.type,
      name: el.name,
      id: el.id,
      placeholder: el.placeholder,
      label: (el.labels && el.labels[0] ? el.labels[0].innerText : '') || el.getAttribute('aria-label') || el.name
    }));
    return {
      inputs: inputs.filter(i => i.type !== 'hidden'),
      textSnippet: text.slice(0, 600)
    };
  });

  console.log('Step 1 Info:', JSON.stringify(stepInfo, null, 2));
})();
