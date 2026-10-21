import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const page = await browser.newPage();
    console.log('Navigating to Interhaul Logistics...');
    await page.goto('https://www.placementindia.com/job-detail/mern-stack-developer-in-interhaul-logistics-at-work-from-home-1333584.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2500));

    // Click Apply
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('a, button'));
      const b = btns.find(x => (x.innerText || '').trim().toLowerCase() === 'apply');
      if (b) b.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Step 1: Mobile
    await page.evaluate(() => {
      const mob = document.querySelector('input[placeholder*="Email ID / Mobile"], input[placeholder*="Mobile"]');
      if (mob) {
        mob.value = '8269647990';
        mob.dispatchEvent(new Event('input', { bubbles: true }));
        mob.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const cont = Array.from(document.querySelectorAll('button, a')).find(x => (x.innerText || '').trim().toLowerCase().includes('continue'));
      if (cont) cont.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    // Step 2: Fill all fields carefully
    await page.evaluate(() => {
      // Name
      const nameInput = document.querySelector('input[placeholder*="Full Name"], input[name="user_name"], #user_name, input[name="candidate_name"]');
      if (nameInput) {
        nameInput.value = 'Pratik Patidar';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      // Email
      const emailInput = document.querySelector('#userEmail, input[name="userEmail"]');
      if (emailInput) {
        emailInput.value = 'patidarpratik0099@gmail.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
        emailInput.dispatchEvent(new Event('blur', { bubbles: true }));
      }
      // City & Locality
      const city = document.querySelector('#search_city');
      if (city) {
        city.value = 'Indore';
        city.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const loc = document.querySelector('#locality');
      if (loc) {
        loc.value = 'Vijay Nagar';
        loc.dispatchEvent(new Event('input', { bubbles: true }));
      }
      // Experience
      const exp = document.querySelector('#total_work_exp_year');
      if (exp) {
        exp.value = '1';
        exp.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Upload Resume
    const fileEl = await page.$('#upload_resume, input[type="file"]');
    if (fileEl) {
      await fileEl.uploadFile(path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf'));
      console.log('Attached resume file');
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
          return 'Submitted form';
        }
      }
      return 'No form found';
    });
    console.log(submitted);

    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'screenshots/2026-10-12/interhaul_submit_verified.png' });
    console.log('Interhaul screenshot saved.');

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
