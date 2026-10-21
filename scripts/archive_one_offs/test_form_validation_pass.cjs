const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    await p.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await p.evaluate(() => {
      const btn = document.querySelector('a.btn-dark#applyJob');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    // Upload resume first
    const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    const fileInput = await p.$('input#upload_resume') || await p.$('input[name="upload_resume"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('Uploaded resume to input#upload_resume');
    }

    // Set all form fields
    const valResult = await p.evaluate(() => {
      const form = document.querySelector('#createAccount');
      form.country_code.value = 'IN';
      form.gender.value = 'M';
      form.userFullName.value = 'Pratik Patidar';
      form.userEmail.value = 'pratikpatidar7990@gmail.com';
      form.userMobileNo.value = '8269647990';
      form.city.value = 'Indore';
      if (form.search_city_hidden) form.search_city_hidden.value = '1035'; // Indore code or any non-empty
      form.locality.value = 'Vijay Nagar';
      form.total_work_exp_year.value = '1';
      form.qualification.value = 'BE^UG';
      if (form.specialization) form.specialization.value = 'Computers';

      return window.validateSeekerRegistration(form);
    });
    console.log('validateSeekerRegistration result after setting fields:', valResult);

    if (valResult) {
      // Find what errors or UI triggered
      console.log('All validations passed! Calling form.submit() or AJAX handler...');
      const ajaxCall = await p.evaluate(() => {
        const form = document.querySelector('#createAccount');
        // Let's trigger submit event
        const event = new Event('submit', { bubbles: true, cancelable: true });
        return form.dispatchEvent(event);
      });
      console.log('Submit event dispatched:', ajaxCall);
      await new Promise(r => setTimeout(r, 6000));
      const postState = await p.evaluate(() => {
        const thanks = document.querySelector('#final_thanks_message');
        const popup = document.querySelector('.popup_box');
        return {
          thanksDisplay: thanks ? window.getComputedStyle(thanks).display : null,
          thanksText: thanks ? thanks.innerText.substring(0, 300) : null,
          popupText: popup ? popup.innerText.substring(0, 300) : null
        };
      });
      console.log('Post state after dispatching submit event:', postState);
    }
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
