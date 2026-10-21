import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();
    console.log('Navigating to Interhaul Logistics job page...');
    await page.goto('https://www.placementindia.com/job-detail/mern-stack-developer-in-interhaul-logistics-at-work-from-home-1333584.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3000));

    await page.screenshot({ path: 'screenshots/2026-10-12/interhaul_page_loaded.png' });
    console.log('Page loaded screenshot saved.');

    // Click Apply
    const clickedApply = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button, input[type="button"]'));
      const applyBtn = btns.find(b => (b.innerText || b.value || '').trim().toLowerCase() === 'apply');
      if (applyBtn) {
        applyBtn.click();
        return 'Clicked Apply';
      }
      return 'Apply button not found';
    });
    console.log(clickedApply);

    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'screenshots/2026-10-12/interhaul_modal_opened.png' });

    // Fill phone number if on step 1
    const step1Filled = await page.evaluate(() => {
      const mob = document.querySelector('input[placeholder*="Email ID / Mobile"], input[placeholder*="Mobile"], input[name*="mobile"]');
      if (mob) {
        mob.value = '8269647990';
        mob.dispatchEvent(new Event('input', { bubbles: true }));
        mob.dispatchEvent(new Event('change', { bubbles: true }));
        return 'Filled mobile 8269647990';
      }
      return 'No mobile input on step 1';
    });
    console.log(step1Filled);

    // Click Continue
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, input[type="button"]'));
      const cont = btns.find(b => (b.innerText || b.value || '').trim().toLowerCase().includes('continue'));
      if (cont) cont.click();
    });

    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: 'screenshots/2026-10-12/interhaul_step2.png' });

    // Fill Profile Modal fields if needed
    await page.evaluate(() => {
      const setVal = (sel, val) => {
        const el = document.querySelector(sel);
        if (el) {
          el.value = val;
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      };
      setVal('#userEmail, input[name="userEmail"]', 'patidarpratik0099@gmail.com');
      setVal('input[name="candidate_name"]', 'Pratik Patidar');
      setVal('#search_city', 'Indore');
      setVal('#locality', 'Vijay Nagar');
    });

    // Upload Resume
    const fileEl = await page.$('#upload_resume, input[type="file"]');
    if (fileEl) {
      await fileEl.uploadFile(path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf'));
      console.log('Interhaul: Resume uploaded');
    }

    await new Promise(r => setTimeout(r, 1000));

    // Submit form
    const submitted = await page.evaluate(() => {
      const allBtns = Array.from(document.querySelectorAll('button, input[type="submit"], a, div'));
      const btn = allBtns.find(b => (b.innerText || b.value || '').trim() === 'Submit Application');
      if (btn) {
        const parentForm = btn.closest('form');
        if (parentForm) {
          parentForm.submit();
          return 'Form submitted via parentForm.submit()';
        }
        btn.click();
        return 'Clicked Submit Application button';
      }
      return 'Submit button not found';
    });
    console.log('Submit trigger:', submitted);

    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'screenshots/2026-10-12/interhaul_final_form_submitted.png' });
    console.log('Interhaul final screenshot saved.');

  } catch (err) {
    console.error('Interhaul error:', err.message);
  }
})();
