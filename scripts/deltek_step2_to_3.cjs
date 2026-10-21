const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const deltekPage = pages.find(p => p.url().includes('brassring.com'));
  if (!deltekPage) return;

  console.log('Selecting Yes on authorization...');
  await deltekPage.evaluate(() => {
    const radios = Array.from(document.querySelectorAll('input[type="radio"], label'));
    const yesOption = radios.find(r => (r.innerText || r.value || '').trim().toLowerCase() === 'yes');
    if (yesOption) {
      yesOption.click();
      if (yesOption.tagName === 'INPUT') yesOption.checked = true;
    }
  });

  await new Promise(r => setTimeout(r, 1500));

  console.log('Clicking #shownext...');
  await deltekPage.evaluate(() => {
    const b = document.getElementById('shownext');
    if (b) b.click();
  });

  await new Promise(r => setTimeout(r, 6000));

  const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\deltek_step3.png';
  await deltekPage.screenshot({ path: ssPath, fullPage: true });
  console.log('Step 3 screenshot saved to:', ssPath);

  const textSnippet = await deltekPage.evaluate(() => document.body ? document.body.innerText.slice(0, 600) : '');
  console.log('Page snippet:', textSnippet);
})();
