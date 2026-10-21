import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('placementindia.com'));
  if (!page) {
    console.log('No placementindia tab found');
    await browser.disconnect();
    return;
  }

  console.log('Filling form and clicking submit (without screenshot timeout)...');

  // Fill form completely
  const fillResult = await page.evaluate(() => {
    // 1. Gender / Title
    const g = document.querySelector('#gender');
    if (g) {
      for (const opt of g.options) {
        if (opt.text.includes('Mr.')) {
          g.value = opt.value;
          break;
        }
      }
      g.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 2. Name
    const nameInput = document.querySelector('#userFullName');
    if (nameInput) {
      nameInput.value = 'Pratik Patidar';
      nameInput.dispatchEvent(new Event('input', { bubbles: true }));
      nameInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 3. Mobile
    const mobileInput = document.querySelector('#userMobileNo');
    if (mobileInput) {
      mobileInput.value = '8269647990';
      mobileInput.dispatchEvent(new Event('input', { bubbles: true }));
      mobileInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 4. City
    const cityInput = document.querySelector('#search_city');
    if (cityInput) {
      cityInput.value = 'Indore';
      cityInput.dispatchEvent(new Event('input', { bubbles: true }));
      cityInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 5. Exp
    const expSelect = document.querySelector('#total_work_exp_year');
    if (expSelect) {
      expSelect.value = '1';
      expSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 6. Qualification
    const qualSelect = document.querySelector('#qualification');
    if (qualSelect) {
      qualSelect.value = 'BTECH^UG';
      qualSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return true;
  });

  console.log('Fields filled. Attaching resume...');
  const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  const fileInput = await page.$('input#upload_resume');
  if (fileInput) {
    await fileInput.uploadFile(resumeAbsPath);
  }

  await new Promise(r => setTimeout(r, 1500));

  console.log('Submitting application...');
  await page.evaluate(() => {
    const popup = document.querySelector('.popup_box');
    if (popup) {
      const submitBtn = Array.from(popup.querySelectorAll('button[type="submit"], input[type="submit"]')).find(b => (b.innerText || b.value || '').toLowerCase().includes('submit'));
      if (submitBtn) submitBtn.click();
    }
  });

  console.log('Waiting 6s for response...');
  await new Promise(r => setTimeout(r, 6000));

  const afterState = await page.evaluate(() => {
    const thanks = document.querySelector('#final_thanks_message');
    const popup = document.querySelector('.popup_box');
    const errs = Array.from(document.querySelectorAll('.error, .err, .error_bdr')).filter(e => window.getComputedStyle(e).display !== 'none' && e.innerText.trim());
    return {
      thanksDisplay: thanks ? window.getComputedStyle(thanks).display : 'none',
      thanksText: thanks ? thanks.innerText.trim() : '',
      popupText: popup ? popup.innerText.slice(0, 300) : '',
      errors: errs.map(e => e.innerText.trim())
    };
  });

  console.log('Post Submit Result:', afterState);
  await browser.disconnect();
})();
