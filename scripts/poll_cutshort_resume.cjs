const puppeteer = require('puppeteer-core');
const path = require('path');
const { CANONICAL_PATHS } = require('./canonical_paths.cjs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    await page.goto('https://cutshort.io/profile/all-jobs?jobid=6a9bc516ee3b291074293ca3', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // Open modal
    await page.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText && b.innerText.trim() === 'Apply now');
      if (btn) ['mousedown', 'mouseup', 'click'].forEach(e => btn.dispatchEvent(new MouseEvent(e, { bubbles: true })));
    });
    await new Promise(r => setTimeout(r, 3000));

    const resumePath = path.join(CANONICAL_PATHS.RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
    const spanBox = await page.evaluate(() => {
      const el = Array.from(document.querySelectorAll('*')).find(e => e.childNodes.length === 1 && e.childNodes[0].nodeType === 3 && e.innerText.trim() === 'Upload resume');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });

    if (spanBox) {
      console.log('Clicking Upload resume...');
      const [fileChooser] = await Promise.all([
        page.waitForFileChooser({ timeout: 8000 }),
        page.mouse.click(spanBox.x, spanBox.y)
      ]);
      await fileChooser.accept([resumePath]);
      console.log('File injected! Polling resume field state...');

      for (let sec = 1; sec <= 20; sec++) {
        await new Promise(r => setTimeout(r, 1000));
        const state = await page.evaluate(() => {
          const fieldset = document.querySelector('fieldset');
          return fieldset ? fieldset.innerText.replace(/\s+/g, ' ') : '';
        });
        console.log(`Sec ${sec} Fieldset: ${state}`);
        if (state.toLowerCase().includes('.pdf') || state.toLowerCase().includes('pratik')) {
          console.log('🎯 SUCCESS: Resume parsed and attached!');
          break;
        }
      }
    }

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await page.close();
    browser.disconnect();
  }
})();
