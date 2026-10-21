const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  if (!deltekPage) return;

  console.log('Populating required fields in Deltek Step 1...');
  await deltekPage.evaluate(() => {
    function setAngularVal(el, val) {
      if (!el) return;
      el.focus();
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      try {
        if (window.angular) {
          window.angular.element(el).val(val).triggerHandler('input');
          window.angular.element(el).triggerHandler('change');
        }
      } catch(e) {}
      el.blur();
    }

    const inps = Array.from(document.querySelectorAll('input'));
    for (const inp of inps) {
      const parent = (inp.closest('div') ? inp.closest('div').innerText : '').toLowerCase();
      if (parent.includes('address line 1') && !inp.value) {
        setAngularVal(inp, 'Indore, Madhya Pradesh');
      } else if (parent.includes('zip') && !inp.value) {
        setAngularVal(inp, '452001');
      }
    }
  });

  await new Promise(r => setTimeout(r, 2000));

  console.log('Clicking #shownext button...');
  await deltekPage.evaluate(() => {
    const nextBtn = document.getElementById('shownext');
    if (nextBtn) nextBtn.click();
  });

  await new Promise(r => setTimeout(r, 6000));

  const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\deltek_step_advanced.png';
  await deltekPage.screenshot({ path: ssPath, fullPage: true });
  console.log('Advanced screenshot saved to:', ssPath);

  const textSnippet = await deltekPage.evaluate(() => document.body ? document.body.innerText.slice(0, 600) : '');
  console.log('Page snippet:', textSnippet);
})();
