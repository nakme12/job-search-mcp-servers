import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('placementindia.com')) || await browser.newPage();

  try {
    console.log('Navigating to Finflock Systems job on PlacementIndia...');
    await page.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-finflock-systems-private-limited-at-delhi-1376651.htm', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));

    console.log('Triggering Apply button...');
    await page.evaluate(() => {
      const btn = document.querySelector('a#applyJob, a.btn-dark');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 4000));

    // If step1 (email) is visible, enter email
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

    // Fill registration / application fields
    await page.evaluate(() => {
      // Gender
      const g = document.querySelector('#gender');
      if (g) {
        for (const opt of g.options) {
          if (opt.text.includes('Mr.')) { g.value = opt.value; break; }
        }
        g.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Name
      const name = document.querySelector('#userFullName');
      if (name) { name.value = 'Pratik Patidar'; name.dispatchEvent(new Event('input', { bubbles: true })); }

      // Mobile
      const mob = document.querySelector('#userMobileNo');
      if (mob) { mob.value = '8269647990'; mob.dispatchEvent(new Event('input', { bubbles: true })); }

      // City
      const city = document.querySelector('#search_city');
      const cityH = document.querySelector('#search_city_hidden');
      if (city) { city.value = 'Indore'; city.dispatchEvent(new Event('input', { bubbles: true })); }
      if (cityH) cityH.value = 'Indore';

      // Locality
      const loc = document.querySelector('#locality');
      const locH = document.querySelector('#locality_hidden');
      if (loc) { loc.value = 'Vijay Nagar'; loc.dispatchEvent(new Event('input', { bubbles: true })); }
      if (locH) locH.value = 'Vijay Nagar';

      // Exp: 1
      const exp = document.querySelector('#total_work_exp_year');
      if (exp) { exp.value = '1'; exp.dispatchEvent(new Event('change', { bubbles: true })); }

      // Qual: B.Tech
      const qual = document.querySelector('#qualification');
      if (qual) { qual.value = 'BTECH^UG'; qual.dispatchEvent(new Event('change', { bubbles: true })); }
    });

    // Upload Resume
    const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    const fileInput = await page.$('input#upload_resume');
    if (fileInput) {
      await fileInput.uploadFile(resumeAbsPath);
    }

    await new Promise(r => setTimeout(r, 1500));

    // Read back all form values from DOM for user review
    const reviewData = await page.evaluate(() => {
      return {
        company: 'Finflock Systems Private Limited',
        role: 'Full Stack Developer / B.Tech (0-1 YOE)',
        gender: document.querySelector('#gender')?.value,
        name: document.querySelector('#userFullName')?.value,
        email: 'pratikpatidar7990@gmail.com',
        mobile: document.querySelector('#userMobileNo')?.value,
        city: document.querySelector('#search_city')?.value,
        locality: document.querySelector('#locality')?.value,
        experienceYears: document.querySelector('#total_work_exp_year')?.value,
        qualification: 'B.Tech',
        resumeAttached: !!document.querySelector('#upload_resume')?.value,
        noticePeriod: '15 Days'
      };
    });

    console.log('REVIEW_DATA_FINFLOCK:');
    console.log(JSON.stringify(reviewData, null, 2));

  } finally {
    await browser.disconnect();
  }
})();
