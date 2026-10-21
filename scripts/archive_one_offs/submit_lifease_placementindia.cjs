const puppeteer = require('puppeteer-core');
const path = require('path');
const fs = require('fs');

(async () => {
  let browser;
  try {
    browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
    const page = await browser.newPage();
    await page.goto('https://www.placementindia.com/job-detail/full-stack-developer-in-lifease-solutions-llp-at-sector-135-noida-1360632.htm', { waitUntil: 'domcontentloaded', timeout: 25000 });
    await new Promise(r => setTimeout(r, 2000));
    
    // Click initial apply
    await page.evaluate(() => {
      const all = Array.from(document.querySelectorAll('a, button'));
      const apply = all.find(el => el.innerText && el.innerText.trim() === 'Apply');
      if (apply) apply.click();
    });
    await new Promise(r => setTimeout(r, 2000));
    
    // Type email
    const emailField = await page.$('input[placeholder*="Email"]');
    if (emailField) {
      await emailField.type('pratikpatidar7990@gmail.com');
      await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button, a'));
        const cont = btns.find(b => b.innerText && b.innerText.includes('Continue'));
        if (cont) cont.click();
      });
      await new Promise(r => setTimeout(r, 3000));
    }
    
    console.log('Filling Create Profile & Apply form...');
    
    // 1. Full Name
    const nameField = await page.$('input[placeholder*="Full Name"]');
    if (nameField) await nameField.type('Pratik Patidar');
    
    // 2. Gender select
    await page.evaluate(() => {
      const genderSelect = document.querySelector('select[name*="gender"], select');
      if (genderSelect) {
        genderSelect.value = 'Male';
        genderSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    
    // 3. Mobile Number
    const mobileField = await page.$('input[placeholder*="Mobile Number"]');
    if (mobileField) await mobileField.type('8269647990');
    
    // 4. Current City
    const cityField = await page.$('input[placeholder*="Current City"]');
    if (cityField) await cityField.type('Indore');
    
    // 5. Locality
    const locField = await page.$('input[placeholder*="Locality"]');
    if (locField) await locField.type('Vijay Nagar');
    
    // 6. Experience & Qualification dropdowns
    await page.evaluate(() => {
      const selects = Array.from(document.querySelectorAll('select'));
      selects.forEach(s => {
        const text = s.innerText.toLowerCase();
        if (text.includes('1 year') || text.includes('experience')) {
          // find option around 1-2 years
          const opt = Array.from(s.options).find(o => o.text.includes('1') || o.text.includes('2'));
          if (opt) s.value = opt.value;
        } else if (text.includes('qualification') || text.includes('graduate')) {
          const opt = Array.from(s.options).find(o => o.text.toLowerCase().includes('b') || o.text.toLowerCase().includes('graduate'));
          if (opt) s.value = opt.value;
        }
        s.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });
    
    // 7. Upload Resume
    const resumePath = path.resolve('resumes', 'Pratik Patidar Resume - MERN Full Stack.pdf');
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log('Uploaded MERN Full Stack resume to file input');
    }
    
    await new Promise(r => setTimeout(r, 2000));
    await page.screenshot({ path: 'screenshots/2026-10-12/preflight_lifease_placementindia.png' });
    console.log('Saved preflight screenshot: screenshots/2026-10-12/preflight_lifease_placementindia.png');
    
    // 8. Submit Application
    console.log('Submitting Application...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, a, input[type="submit"]'));
      const sub = btns.find(b => b.innerText && b.innerText.includes('Submit Application'));
      if (sub) sub.click();
    });
    
    await new Promise(r => setTimeout(r, 5000));
    await page.screenshot({ path: 'screenshots/2026-10-12/submitted_lifease_placementindia.png' });
    console.log('Saved submission confirmation screenshot: screenshots/2026-10-12/submitted_lifease_placementindia.png');
    
    const postSubmitText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log('POST_SUBMIT_TEXT:\n', postSubmitText);
    await page.close();
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    process.exit(0);
  }
})();
