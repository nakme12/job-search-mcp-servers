const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  if (!deltekPage) return;

  console.log('Filling missing address and pincode...');
  await deltekPage.evaluate(() => {
    function fireInputEvents(el, val) {
      if (!el) return;
      el.focus();
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      el.blur();
    }

    const allInputs = Array.from(document.querySelectorAll('input'));
    for (const inp of allInputs) {
      const label = (inp.getAttribute('aria-label') || (inp.labels && inp.labels[0] ? inp.labels[0].innerText : '') || inp.name || inp.id || '').toLowerCase();
      if (label.includes('address line 1') || label.includes('address1')) {
        fireInputEvents(inp, 'Indore, Madhya Pradesh');
      } else if (label.includes('zip') || label.includes('postal')) {
        fireInputEvents(inp, '452001');
      }
    }
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('Clicking Continue button...');
  await deltekPage.evaluate(() => {
    const btn = document.getElementById('continue') || 
                Array.from(document.querySelectorAll('button')).find(b => /continue/i.test(b.innerText.trim()));
    if (btn) btn.click();
  });

  await new Promise(r => setTimeout(r, 6000));

  const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\deltek_step2.png';
  await deltekPage.screenshot({ path: ssPath, fullPage: true });
  console.log('Step 2 screenshot saved to:', ssPath);

  const stepInfo = await deltekPage.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    return {
      url: window.location.href,
      textSnippet: text.slice(0, 500)
    };
  });
  console.log('Step 2 info:', stepInfo);
})();
