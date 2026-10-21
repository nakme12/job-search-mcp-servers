import puppeteer from 'puppeteer-core';
import path from 'path';

(async () => {
  try {
    const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
    const pages = await browser.pages();
    let page = pages.find(p => p.url().includes('placementindia.com'));
    if (!page) {
      console.log('No placementindia page open.');
      return;
    }

    // 1. Fill Name
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const nameInput = inputs.find(i => i.placeholder && i.placeholder.includes('Full Name'));
      if (nameInput) {
        nameInput.value = 'Pratik Patidar';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 2. Fill Email
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const emailInput = inputs.find(i => i.placeholder && i.placeholder.includes('Email ID'));
      if (emailInput) {
        emailInput.value = 'patidarpratik0099@gmail.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 3. Select Gender
    await page.evaluate(() => {
      // Find select for gender
      const selects = Array.from(document.querySelectorAll('select'));
      for (const sel of selects) {
        for (const opt of sel.options) {
          if (opt.text.toLowerCase().includes('male')) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
            return;
          }
        }
      }
      // If custom dropdown, click it
      const customDropdown = Array.from(document.querySelectorAll('div, span, button')).find(el => (el.innerText || '').includes('Select Gender'));
      if (customDropdown) {
        customDropdown.click();
      }
    });

    // 4. Fill City & Locality
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input'));
      const cityInput = inputs.find(i => i.placeholder && i.placeholder.includes('Current City'));
      if (cityInput) {
        cityInput.value = 'Indore';
        cityInput.dispatchEvent(new Event('input', { bubbles: true }));
        cityInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
      const locInput = inputs.find(i => i.placeholder && i.placeholder.includes('Locality'));
      if (locInput) {
        locInput.value = 'Vijay Nagar';
        locInput.dispatchEvent(new Event('input', { bubbles: true }));
        locInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // 5. Select Experience & Qualification
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      for (const sel of selects) {
        // Experience
        for (const opt of sel.options) {
          if (opt.text.includes('1 Year') || opt.value === '1' || opt.text === '1') {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
        // Qualification
        for (const opt of sel.options) {
          if (opt.text.toLowerCase().includes('bachelor') || opt.text.toLowerCase().includes('b.tech') || opt.text.toLowerCase().includes('graduate')) {
            sel.value = opt.value;
            sel.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    });

    // 6. Upload Resume
    const fileInputs = await page.$$('input[type="file"]');
    for (const fi of fileInputs) {
      try {
        await fi.uploadFile(path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf'));
        console.log('Resume file attached to file input');
      } catch (e) {}
    }

    await new Promise(r => setTimeout(r, 1500));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_before_final_click.png' });

    // 7. Click Submit Application
    const clickedSubmit = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, input[type="submit"], a.btn'));
      const sub = btns.find(b => (b.innerText || b.value || '').trim().toLowerCase() === 'submit application');
      if (sub) {
        sub.click();
        return 'Clicked Submit Application';
      }
      return 'Submit button not found';
    });
    console.log(clickedSubmit);

    await new Promise(r => setTimeout(r, 4000));
    await page.screenshot({ path: 'screenshots/2026-10-12/lifease_submitted_final_proof.png' });
    console.log('Final proof captured');

  } catch (err) {
    console.error('Error:', err.message);
  }
})();
