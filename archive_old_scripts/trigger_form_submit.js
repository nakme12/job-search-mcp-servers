import puppeteer from 'puppeteer-core';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('placementindia.com'));
    if (!page) {
      console.log('No placementindia page found');
      return;
    }

    const clickDiag = await page.evaluate(() => {
      const q = document.querySelector('#qualification, select[name="qualification"]');
      let qualVal = '';
      if (q) {
        // Change to B.Tech / BCA
        for (let opt of q.options) {
          if (opt.text.toLowerCase().includes('b.tech') || opt.text.toLowerCase().includes('computer')) {
            q.value = opt.value;
            q.dispatchEvent(new Event('change', { bubbles: true }));
            qualVal = opt.text;
            break;
          }
        }
      }

      // Find form element
      const forms = Array.from(document.querySelectorAll('form'));
      const formInfo = forms.map(f => ({ id: f.id, name: f.name, action: f.action }));

      // Find the submit button
      const allBtns = Array.from(document.querySelectorAll('button, input[type="submit"], a, div'));
      const btn = allBtns.find(b => (b.innerText || b.value || '').trim() === 'Submit Application');

      let triggered = 'None';
      if (btn) {
        btn.focus();
        btn.click();
        // also if inside a form, submit form directly
        const parentForm = btn.closest('form');
        if (parentForm) {
          parentForm.submit();
          triggered = 'Form submitted via parentForm.submit()';
        } else {
          triggered = 'Clicked button directly';
        }
      }

      return { qualVal, formInfo, triggered };
    });

    console.log('Submit execution result:', JSON.stringify(clickDiag, null, 2));

    await new Promise(r => setTimeout(r, 6000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_final_form_submitted.png' });
    console.log('Final screenshot saved');

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
