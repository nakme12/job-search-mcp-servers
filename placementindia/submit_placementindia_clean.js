import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('placementindia.com'));
    if (!page) {
      console.log('No placementindia page found');
      return;
    }

    // 1. Fill Email
    await page.evaluate(() => {
      const emailEl = document.querySelector('#email, input[name="email"]');
      if (emailEl) {
        emailEl.value = 'patidarpratik0099@gmail.com';
        emailEl.dispatchEvent(new Event('input', { bubbles: true }));
        emailEl.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    console.log('Set email to patidarpratik0099@gmail.com');

    // 2. Select Gender: inspect options of gender select or radio
    await page.evaluate(() => {
      const g = document.querySelector('#gender, select[name="gender"]');
      if (g) {
        g.value = 'M'; // PlacementIndia uses 'M' for Male or 'Male'
        if (!g.value) g.value = 'Male';
        g.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // If there are radio buttons for gender:
      const radios = Array.from(document.querySelectorAll('input[type="radio"][name*="gender"]'));
      for (const r of radios) {
        if (r.value.toLowerCase().startsWith('m')) r.click();
      }
    });

    // 3. Set Qualification: select B.Tech / BCA / Graduate
    await page.evaluate(() => {
      const q = document.querySelector('#qualification, select[name="qualification"]');
      if (q) {
        for (const opt of q.options) {
          if (opt.text.toLowerCase().includes('b.tech') || opt.text.toLowerCase().includes('graduate') || opt.text.toLowerCase().includes('bachelor')) {
            q.value = opt.value;
            q.dispatchEvent(new Event('change', { bubbles: true }));
            break;
          }
        }
      }
    });

    // 4. Click outside to dismiss any dropdown autocomplete
    await page.mouse.click(10, 10);
    await new Promise(r => setTimeout(r, 1000));

    // 5. Ensure resume is uploaded
    const fileEl = await page.$('#upload_resume, input[type="file"]');
    if (fileEl) {
      await fileEl.uploadFile(path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf'));
      console.log('Uploaded resume');
    }

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_before_submit_clean.png' });

    // 6. Click Submit Application button
    const submitClicked = await page.evaluate(() => {
      const btn = document.querySelector('#submit_btn, #btn_submit, .btn-apply-job') ||
                  Array.from(document.querySelectorAll('button, input[type="submit"], a.btn')).find(b => (b.innerText || b.value || '').trim().toLowerCase().includes('submit application'));
      if (btn) {
        btn.click();
        return 'Clicked ' + (btn.innerText || btn.value);
      }
      return 'Submit button not found';
    });
    console.log(submitClicked);

    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_post_submit_clean.png' });
    console.log('Post submit screenshot saved.');

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
