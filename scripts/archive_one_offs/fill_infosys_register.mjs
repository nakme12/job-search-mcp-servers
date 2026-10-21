import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();

  try {
    console.log('Navigating to Infosys Career Registration portal...');
    await p.goto('https://career.infosys.com/register', { waitUntil: 'networkidle2', timeout: 35000 });

    const screenshotDir = path.resolve('screenshots/2026-10-13');
    if (!fs.existsSync(screenshotDir)) fs.mkdirSync(screenshotDir, { recursive: true });

    console.log('Inspecting Infosys registration fields...');
    const formFields = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select, textarea, button')).map(el => ({
        tag: el.tagName,
        type: el.type,
        name: el.name,
        id: el.id,
        placeholder: el.placeholder,
        ariaLabel: el.getAttribute('aria-label'),
        text: el.innerText.trim()
      })).filter(el => el.tag !== 'BUTTON' || el.text.length > 0);
    });

    console.log('Fields on Infosys registration:', JSON.stringify(formFields, null, 2));

    // Fill registration fields
    // First Name / Last Name or Full Name
    const nameFilled = await p.evaluate(() => {
      const fn = document.querySelector('input[name*="first"], input[id*="first"], input[placeholder*="First Name"]');
      const ln = document.querySelector('input[name*="last"], input[id*="last"], input[placeholder*="Last Name"]');
      const full = document.querySelector('input[name*="name"], input[id*="name"], input[placeholder*="Full Name"]');
      if (fn && ln) {
        fn.value = 'Pratik';
        fn.dispatchEvent(new Event('input', { bubbles: true }));
        ln.value = 'Patidar';
        ln.dispatchEvent(new Event('input', { bubbles: true }));
        return 'first_last';
      } else if (full) {
        full.value = 'Pratik Patidar';
        full.dispatchEvent(new Event('input', { bubbles: true }));
        return 'full_name';
      }
      return 'none';
    });
    console.log('Name fill strategy:', nameFilled);

    // Email
    await p.evaluate(() => {
      const em = document.querySelector('input[type="email"], input[name*="email"], input[id*="email"], input[placeholder*="Email"]');
      if (em) {
        em.value = 'pratikpatidar7990@gmail.com';
        em.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Mobile
    await p.evaluate(() => {
      const mob = document.querySelector('input[type="tel"], input[name*="phone"], input[name*="mobile"], input[id*="phone"], input[id*="mobile"], input[placeholder*="Phone"], input[placeholder*="Mobile"]');
      if (mob) {
        mob.value = '8269647990';
        mob.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });

    // Password fields (Mmmmmm@1)
    await p.evaluate(() => {
      const pwds = Array.from(document.querySelectorAll('input[type="password"]'));
      pwds.forEach(pwd => {
        pwd.value = 'Mmmmmm@1';
        pwd.dispatchEvent(new Event('input', { bubbles: true }));
        pwd.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    // Experience / Skills if available
    await p.evaluate(() => {
      const exp = document.querySelector('input[name*="exp"], select[name*="exp"], input[id*="exp"], select[id*="exp"]');
      if (exp) {
        if (exp.tagName === 'SELECT') {
          for (const opt of exp.options) {
            if (opt.text.includes('1') || opt.text.includes('0-2') || opt.value.includes('1')) {
              exp.value = opt.value;
              break;
            }
          }
          exp.dispatchEvent(new Event('change', { bubbles: true }));
        } else {
          exp.value = '1.5';
          exp.dispatchEvent(new Event('input', { bubbles: true }));
        }
      }
    });

    // Checkboxes / Consent
    await p.evaluate(() => {
      const chks = document.querySelectorAll('input[type="checkbox"]');
      chks.forEach(c => {
        c.checked = true;
        c.dispatchEvent(new Event('change', { bubbles: true }));
      });
    });

    await new Promise(r => setTimeout(r, 2000));

    // Upload Resume if file input exists
    const fileInput = await p.$('input[type="file"]');
    if (fileInput) {
      const resumeAbsPath = path.resolve('resumes/Pratik Patidar Resume - React Developer.pdf');
      console.log('Attaching resume:', resumeAbsPath);
      await fileInput.uploadFile(resumeAbsPath);
      await new Promise(r => setTimeout(r, 2000));
    }

    // Capture screenshot before submit
    const prePath = path.resolve(screenshotDir, 'infosys_register_filled.png');
    await p.screenshot({ path: prePath, fullPage: true });
    console.log('Saved screenshot of filled Infosys registration:', prePath);

    const filledValues = await p.evaluate(() => {
      return Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
        id: i.id,
        name: i.name,
        type: i.type,
        value: i.type === 'password' ? '********' : i.value,
        checked: i.checked
      })).filter(i => i.value || i.checked);
    });

    console.log('FILLED_INFOSYS_DATA:');
    console.log(JSON.stringify(filledValues, null, 2));

  } finally {
    // Keep tab open in Brave!
    await browser.disconnect();
  }
})();
