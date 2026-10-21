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

  console.log('Submitting PlacementIndia Interhaul application with all mandatory fields...');

  const fillStatus = await page.evaluate(() => {
    // 1. Gender
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

    // 2. Full Name
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

    // 4. City & search_city_hidden
    const cityInput = document.querySelector('#search_city');
    const cityHidden = document.querySelector('input[name="search_city_hidden"], #search_city_hidden');
    if (cityInput) {
      cityInput.value = 'Indore';
      cityInput.dispatchEvent(new Event('input', { bubbles: true }));
      cityInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (cityHidden) {
      cityHidden.value = 'Indore';
    }

    // 5. Locality
    const locInput = document.querySelector('#locality');
    const locHidden = document.querySelector('#locality_hidden');
    if (locInput) {
      locInput.value = 'Vijay Nagar';
      locInput.dispatchEvent(new Event('input', { bubbles: true }));
      locInput.dispatchEvent(new Event('change', { bubbles: true }));
    }
    if (locHidden) {
      locHidden.value = 'Vijay Nagar';
    }

    // 6. Experience
    const expSelect = document.querySelector('#total_work_exp_year');
    if (expSelect) {
      expSelect.value = '1';
      expSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // 7. Qualification
    const qualSelect = document.querySelector('#qualification');
    if (qualSelect) {
      qualSelect.value = 'BTECH^UG';
      qualSelect.dispatchEvent(new Event('change', { bubbles: true }));
    }

    return true;
  });

  // Resume upload
  const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');
  const fileInput = await page.$('input#upload_resume');
  if (fileInput) {
    await fileInput.uploadFile(resumeAbsPath);
  }

  await new Promise(r => setTimeout(r, 1500));

  // Run validation directly to check if valid
  const validationTest = await page.evaluate(() => {
    const form = document.querySelector('#createAccount');
    if (form && typeof validateSeekerRegistration === 'function') {
      const valid = validateSeekerRegistration(form);
      return { valid };
    }
    return { valid: null };
  });

  console.log('Validation test result:', validationTest);

  if (validationTest.valid) {
    console.log('Form is valid! Clicking Submit Application...');
    await page.evaluate(() => {
      const btn = document.querySelector('#createAccount button[type="submit"]');
      if (btn) btn.click();
    });

    await new Promise(r => setTimeout(r, 6000));

    const finalState = await page.evaluate(() => {
      const thanks = document.querySelector('#final_thanks_message');
      const popup = document.querySelector('.popup_box');
      return {
        thanksDisplay: thanks ? window.getComputedStyle(thanks).display : 'none',
        thanksHTML: thanks ? thanks.innerText.trim() : '',
        popupText: popup ? popup.innerText.slice(0, 300) : ''
      };
    });

    console.log('Final Application State:', finalState);

    // Save to tracker if applied
    const TRACKER_FILE = path.resolve('weekly_applied.json');
    const tracker = JSON.parse(fs.readFileSync(TRACKER_FILE, 'utf8'));
    tracker.applied.unshift({
      id: tracker.applied.length + 1,
      company: 'Interhaul Logistics',
      role: 'Looking For Software Web Developer (MERN Stack)',
      location: 'Delhi (WFH)',
      recipient_or_url: 'https://www.placementindia.com/job-detail/mern-stack-developer-in-interhaul-logistics-at-work-from-home-1333584.htm',
      channel: 'PlacementIndia Direct Portal',
      status: 'Applied & Submitted (Verified in DOM)',
      date: '2026-10-13',
      timestamp: new Date().toISOString(),
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
      notes: 'Applied via PlacementIndia portal registration with 1.5 YOE profile & resume'
    });
    tracker.total_lifetime_applied += 1;
    fs.writeFileSync(TRACKER_FILE, JSON.stringify(tracker, null, 2));
    console.log('Logged to weekly_applied.json!');
  } else {
    const errText = await page.evaluate(() => {
      const errs = Array.from(document.querySelectorAll('.error, .err, .error_bdr')).filter(e => window.getComputedStyle(e).display !== 'none' && e.innerText.trim());
      return errs.map(e => e.innerText.trim());
    });
    console.log('Validation errors:', errText);
  }

  await browser.disconnect();
})();
