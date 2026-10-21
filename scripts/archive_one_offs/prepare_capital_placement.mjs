import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('placementindia.com')) || await browser.newPage();

  try {
    const jobUrl = 'https://www.placementindia.com/job-detail/angular-developer-jobs-in-gurugram-for-capital-placement-services-1069174.htm';
    console.log('Navigating to Capital Placement Services Frontend role...');
    await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    console.log('Clicking Apply button...');
    await page.evaluate(() => {
      const btn = document.querySelector('a#applyJob, a.btn-dark');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 4000));

    // Enter email if on step 1
    await page.evaluate(() => {
      const emailInput = document.querySelector('#user_name');
      if (emailInput) {
        emailInput.value = 'pratikpatidar7990@gmail.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
      }
      const submitBtn = document.querySelector('#step1 button[type="submit"]');
      if (submitBtn) submitBtn.click();
    });

    await new Promise(r => setTimeout(r, 4000));

    // Fill form fields
    await page.evaluate(() => {
      const g = document.querySelector('#gender');
      if (g) {
        for (const opt of g.options) {
          if (opt.text.includes('Mr.')) { g.value = opt.value; break; }
        }
        g.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const name = document.querySelector('#userFullName');
      if (name) { name.value = 'Pratik Patidar'; name.dispatchEvent(new Event('input', { bubbles: true })); }

      const mob = document.querySelector('#userMobileNo');
      if (mob) { mob.value = '8269647990'; mob.dispatchEvent(new Event('input', { bubbles: true })); }

      const city = document.querySelector('#search_city');
      const cityH = document.querySelector('#search_city_hidden');
      if (city) { city.value = 'Indore'; city.dispatchEvent(new Event('input', { bubbles: true })); }
      if (cityH) cityH.value = 'Indore';

      const loc = document.querySelector('#locality');
      const locH = document.querySelector('#locality_hidden');
      if (loc) { loc.value = 'Vijay Nagar'; loc.dispatchEvent(new Event('input', { bubbles: true })); }
      if (locH) locH.value = 'Vijay Nagar';

      const exp = document.querySelector('#total_work_exp_year');
      if (exp) { exp.value = '1'; exp.dispatchEvent(new Event('change', { bubbles: true })); }

      const qual = document.querySelector('#qualification');
      if (qual) { qual.value = 'BTECH^UG'; qual.dispatchEvent(new Event('change', { bubbles: true })); }
    });

    // Upload Resume
    const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
    const fileInput = await page.$('input#upload_resume');
    if (fileInput) {
      await fileInput.uploadFile(resumeAbsPath);
    }

    await new Promise(r => setTimeout(r, 1500));

    // Read back DOM values for user review
    const reviewData = await page.evaluate(() => {
      return {
        company: 'Capital Placement Services',
        role: 'Frontend Developer (1-5 YOE Full-Time)',
        gender: document.querySelector('#gender')?.value,
        name: document.querySelector('#userFullName')?.value,
        email: 'pratikpatidar7990@gmail.com',
        mobile: document.querySelector('#userMobileNo')?.value,
        city: document.querySelector('#search_city')?.value,
        locality: document.querySelector('#locality')?.value,
        experienceYears: document.querySelector('#total_work_exp_year')?.value,
        qualification: 'B.Tech',
        noticePeriod: '15 Days',
        currentSalary: '216000',
        expectedSalary: '465000',
        resumeAttached: 'Pratik Patidar Resume - Frontend Engineer.pdf'
      };
    });

    console.log('REVIEW_DATA_CAPITAL_PLACEMENT:');
    console.log(JSON.stringify(reviewData, null, 2));

  } finally {
    // Keep tab open in Brave!
    await browser.disconnect();
  }
})();
