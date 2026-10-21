const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    await p.setViewport({ width: 1280, height: 950 });
    console.log('Navigating to Impact HR job...');
    await p.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-impact-hr-km-solutions-at-nashik-1467115.htm', { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 2000));

    console.log('Clicking Apply Now button...');
    await p.evaluate(() => {
      const btn = document.querySelector('a.btn-dark#applyJob');
      if (btn) btn.click();
    });
    await new Promise(r => setTimeout(r, 2500));

    console.log('Populating createAccount form fields via DOM evaluation...');
    await p.evaluate(() => {
      const form = document.querySelector('#createAccount') || document;

      // 1. Gender -> Mr. ('M')
      const g = form.querySelector('select[name="gender"]');
      if (g) {
        g.value = 'M';
        g.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 2. Full Name
      const name = form.querySelector('input[name="userFullName"]');
      if (name) {
        name.value = 'Pratik Patidar';
        name.dispatchEvent(new Event('input', { bubbles: true }));
        name.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 3. Email
      const email = form.querySelector('input[name="userEmail"]');
      if (email) {
        email.value = 'pratikpatidar7990@gmail.com';
        email.dispatchEvent(new Event('input', { bubbles: true }));
        email.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 4. Mobile
      const mobile = form.querySelector('input[name="userMobileNo"]');
      if (mobile) {
        mobile.value = '8269647990';
        mobile.dispatchEvent(new Event('input', { bubbles: true }));
        mobile.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 5. City
      const city = form.querySelector('input[name="city"]');
      if (city) {
        city.value = 'Indore';
        city.dispatchEvent(new Event('input', { bubbles: true }));
        city.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 6. Locality
      const loc = form.querySelector('input[name="locality"]');
      if (loc) {
        loc.value = 'Vijay Nagar';
        loc.dispatchEvent(new Event('input', { bubbles: true }));
        loc.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 7. Experience -> 1 Years ('1')
      const exp = form.querySelector('select[name="total_work_exp_year"]');
      if (exp) {
        exp.value = '1';
        exp.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 8. Qualification -> B.E ('BE^UG')
      const qual = form.querySelector('select[name="qualification"]');
      if (qual) {
        qual.value = 'BE^UG';
        qual.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise(r => setTimeout(r, 1500));

    // Specialization
    await p.evaluate(() => {
      const form = document.querySelector('#createAccount') || document;
      const spec = form.querySelector('select[name="specialization"]');
      if (spec) {
        spec.value = 'Computers';
        spec.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    // Resume Upload
    const resumePath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
    console.log('Attaching resume:', resumePath, 'exists:', fs.existsSync(resumePath));
    const fileInput = await p.$('input#upload_resume') || await p.$('input[name="upload_resume"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('Resume attached to file input');
    }

    await new Promise(r => setTimeout(r, 2000));

    // Pre-submit screenshot
    const prePath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/impact_hr_km_presubmit.png';
    await p.screenshot({ path: prePath, fullPage: false });
    console.log('Pre-submit screenshot saved:', prePath);

    // Click Submit
    console.log('Submitting application on createAccount form...');
    await p.evaluate(() => {
      const form = document.querySelector('#createAccount');
      if (form) {
        const sub = form.querySelector('button[type="submit"], input[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => (b.innerText || '').toLowerCase().includes('submit application'));
        if (sub) sub.click();
      }
    });

    console.log('Waiting 8s for submission response...');
    await new Promise(r => setTimeout(r, 8000));

    // Post-submit screenshot
    const postPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/impact_hr_km_postsubmit.png';
    await p.screenshot({ path: postPath, fullPage: false });
    console.log('Post-submit screenshot saved:', postPath);

    const postState = await p.evaluate(() => {
      const thanks = document.querySelector('#final_thanks_message, .thanks, .alert-success');
      const errs = Array.from(document.querySelectorAll('.error, .err, .error_bdr')).filter(e => window.getComputedStyle(e).display !== 'none' && e.innerText.trim());
      return {
        url: window.location.href,
        thanksDisplay: thanks ? window.getComputedStyle(thanks).display : 'none',
        thanksText: thanks ? thanks.innerText.trim() : '',
        errors: errs.map(e => e.innerText.trim()),
        bodySnippet: document.body.innerText.substring(0, 500)
      };
    });
    console.log('Post submit state:', postState);
  } finally {
    await p.close();
    await browser.disconnect();
  }
})();
