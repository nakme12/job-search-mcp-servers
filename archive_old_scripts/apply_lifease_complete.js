import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();
    console.log('Navigating to Lifease Solutions LLP job page...');
    await page.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-lifease-solutions-llp-at-sector-135-noida-1360632.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_navigated.png' });
    console.log('Page loaded, checking for apply button...');

    // Click Apply button on the page to open form/modal
    const clickedApply = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button, input[type="button"]'));
      const applyBtn = btns.find(b => (b.innerText || b.value || '').trim().toLowerCase().includes('apply'));
      if (applyBtn) {
        applyBtn.click();
        return 'Clicked apply button: ' + (applyBtn.innerText || applyBtn.value);
      }
      return 'No apply button found';
    });
    console.log(clickedApply);

    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_form_opened.png' });

    // Fill form fields
    const filledInfo = await page.evaluate(() => {
      let log = [];
      const setVal = (selector, val) => {
        const el = document.querySelector(selector);
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
          log.push(selector + ' -> ' + val);
        }
      };

      setVal('input[name="candidate_name"], input[placeholder*="Name"], input#candidate_name', 'Pratik Patidar');
      setVal('input[name="email"], input[placeholder*="Email"], input#email', 'patidarpratik0099@gmail.com');
      setVal('input[name="mobile"], input[placeholder*="Mobile"], input#mobile', '8269647990');
      setVal('input[name="city"], input[placeholder*="City"], input#city', 'Indore');
      setVal('input[name="locality"], input[placeholder*="Locality"], input#locality', 'Vijay Nagar');
      setVal('input[name="total_exp"], select[name="total_exp"]', '1');

      // Gender
      const g = document.querySelector('select[name="gender"], select#gender');
      if (g) {
        const opt = Array.from(g.options).find(o => o.text.trim().toLowerCase() === 'male' || o.value.trim().toLowerCase() === 'male');
        if (opt) {
          g.value = opt.value;
          g.dispatchEvent(new Event('change', { bubbles: true }));
          log.push('gender -> ' + opt.text);
        }
      }

      return log.join(', ');
    });
    console.log('Fields filled:', filledInfo);

    // Upload Resume
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
      await fileInput.uploadFile(resumePath);
      console.log('Uploaded resume:', resumePath);
    } else {
      console.log('No file input found');
    }

    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_ready_to_submit.png' });

    // Submit
    const submitted = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], input[type="button"], a.btn'));
      const btn = buttons.find(b => {
        const text = (b.innerText || b.value || '').trim().toLowerCase();
        return text.includes('submit application') || text.includes('apply now') || text === 'submit';
      });
      if (btn) {
        btn.click();
        return 'Clicked submit: ' + (btn.innerText || btn.value);
      }
      return 'No submit button';
    });
    console.log('Submit trigger:', submitted);

    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_post_submit.png' });
    console.log('Post submit snapshot taken.');

    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000).replace(/\s+/g, ' '));
    console.log('Result text:', bodyText.slice(0, 300));

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
