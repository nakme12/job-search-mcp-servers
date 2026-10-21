import puppeteer from 'puppeteer-core';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  try {
    console.log('Navigating to Dusker AI Web Developer (Easy Apply)...');
    await page.goto('https://in.linkedin.com/jobs/view/web-developer-at-dusker-ai-4475661338', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    // Click Easy Apply
    await page.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button')).find(el => (el.innerText || '').toLowerCase().includes('easy apply'));
      if (b) b.click();
    });

    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'screenshots/2026-10-13/dusker_ai_step1.png' });

    // Loop through steps until final Review/Submit screen (DO NOT CLICK SUBMIT)
    for (let step = 1; step <= 5; step++) {
      const stepState = await page.evaluate(() => {
        const dialog = document.querySelector('.jobs-easy-apply-modal, [role="dialog"]');
        if (!dialog) return { done: true, reason: 'no dialog' };

        // Fill any text inputs
        const inputs = Array.from(dialog.querySelectorAll('input[type="text"], input:not([type])'));
        inputs.forEach(inp => {
          if (!inp.value) {
            inp.value = '1';
            inp.dispatchEvent(new Event('input', { bubbles: true }));
            inp.dispatchEvent(new Event('change', { bubbles: true }));
          }
        });

        const nextBtn = Array.from(dialog.querySelectorAll('button')).find(b => (b.innerText || '').trim().toLowerCase() === 'next');
        const reviewBtn = Array.from(dialog.querySelectorAll('button')).find(b => (b.innerText || '').trim().toLowerCase() === 'review');
        const submitBtn = Array.from(dialog.querySelectorAll('button')).find(b => (b.innerText || '').trim().toLowerCase().includes('submit'));

        if (submitBtn) {
          return { done: true, isSubmitScreen: true };
        } else if (reviewBtn) {
          reviewBtn.click();
          return { clicked: 'review' };
        } else if (nextBtn) {
          nextBtn.click();
          return { clicked: 'next' };
        }
        return { done: true, reason: 'no navigation button' };
      });

      console.log(`Step ${step} action:`, stepState);
      if (stepState.isSubmitScreen) {
        console.log('REACHED FINAL SUBMIT SCREEN FOR DUSKER AI! NOT SUBMITTING.');
        break;
      }
      await new Promise(r => setTimeout(r, 2000));
    }

    await page.screenshot({ path: 'screenshots/2026-10-13/dusker_ai_ready_to_submit.png' });
    console.log('Saved final review screenshot: screenshots/2026-10-13/dusker_ai_ready_to_submit.png');

  } catch (err) {
    console.error('Error on Dusker AI:', err.message);
  }
})();
