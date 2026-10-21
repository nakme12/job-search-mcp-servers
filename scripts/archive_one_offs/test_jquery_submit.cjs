const puppeteer = require('puppeteer-core');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    p.on('request', req => {
      if (req.method() === 'POST') console.log('POST Request:', req.url());
    });
    p.on('response', async res => {
      if (res.request().method() === 'POST') {
        console.log('POST Response status:', res.status(), 'from:', res.url());
        try {
          console.log('Response body:', (await res.text()).substring(0, 300));
        } catch(e){}
      }
    });

    await p.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));
    await p.evaluate(() => {
      const btn = document.querySelector('a.btn-dark#applyJob');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2000));

    const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    const fileInput = await p.$('input#upload_resume');
    if (fileInput) await fileInput.uploadFile(resumePath);

    await p.evaluate(() => {
      const form = document.querySelector('#createAccount');
      form.country_code.value = 'IN';
      form.gender.value = 'M';
      form.userFullName.value = 'Pratik Patidar';
      form.userEmail.value = 'pratikpatidar7990@gmail.com';
      form.userMobileNo.value = '8269647990';
      form.city.value = 'Indore';
      if (form.search_city_hidden) form.search_city_hidden.value = '1035';
      form.locality.value = 'Vijay Nagar';
      form.total_work_exp_year.value = '1';
      form.qualification.value = 'BE^UG';
      if (form.specialization) form.specialization.value = 'Computers';
    });

    console.log('Triggering jQuery submit on #createAccount...');
    await p.evaluate(() => {
      $('#createAccount').trigger('submit');
    });

    console.log('Waiting 8s for AJAX completion...');
    await new Promise(r => setTimeout(r, 8000));

    const result = await p.evaluate(() => {
      const thanks = document.querySelector('#final_thanks_message');
      const errs = Array.from(document.querySelectorAll('.error, .err, .error_bdr')).filter(e => window.getComputedStyle(e).display !== 'none');
      const bodySnippet = document.body.innerText.substring(0, 500);
      return {
        thanksDisplay: thanks ? window.getComputedStyle(thanks).display : null,
        thanksText: thanks ? thanks.innerText.substring(0, 300) : null,
        errCount: errs.length,
        errTexts: errs.map(e => e.innerText.trim()).filter(Boolean),
        bodySnippet
      };
    });
    console.log('Submission result:', result);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
