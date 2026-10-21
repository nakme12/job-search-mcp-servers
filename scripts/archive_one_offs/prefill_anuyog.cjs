const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222' });
  const p = await browser.newPage();
  try {
    console.log('Opening Anuyog career form in tab...');
    await p.goto('https://anuyogsoftwares.com/careers?role=JD-2026-021#apply', { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 3000));
    
    console.log('Pre-filling candidate fields...');
    await p.evaluate(() => {
      // 1. Role
      const roleSelect = document.querySelector('select[name="role"], #apply-role');
      if (roleSelect) {
        for (const opt of roleSelect.options) {
          if (opt.text.includes('JD-2026-021') || opt.text.includes('Software Development Engineer I')) {
            roleSelect.value = opt.value;
            break;
          }
        }
        roleSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 2. Name
      const nameInput = document.querySelector('input[name="name"]');
      if (nameInput) {
        nameInput.value = 'Pratik Patidar';
        nameInput.dispatchEvent(new Event('input', { bubbles: true }));
        nameInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 3. Email
      const emailInput = document.querySelector('input[name="email"]');
      if (emailInput) {
        emailInput.value = 'pratikpatidar7990@gmail.com';
        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
        emailInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 4. Phone
      const phoneInput = document.querySelector('input[name="phone"]');
      if (phoneInput) {
        phoneInput.value = '8269647990';
        phoneInput.dispatchEvent(new Event('input', { bubbles: true }));
        phoneInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 5. Experience
      const expInput = document.querySelector('input[name="experience_years"]');
      if (expInput) {
        expInput.value = '1.5';
        expInput.dispatchEvent(new Event('input', { bubbles: true }));
        expInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 6. Notice Period
      const npInput = document.querySelector('input[name="notice_period"]');
      if (npInput) {
        npInput.value = 'Immediate';
        npInput.dispatchEvent(new Event('input', { bubbles: true }));
        npInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 7. CV URL
      const cvInput = document.querySelector('input[name="cv_url"]');
      if (cvInput) {
        cvInput.value = 'https://pratik-portfolio-nine-orcin.vercel.app';
        cvInput.dispatchEvent(new Event('input', { bubbles: true }));
        cvInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 8. Portfolio / GitHub
      const portInput = document.querySelector('input[name="portfolio_url"]');
      if (portInput) {
        portInput.value = 'https://www.linkedin.com/in/pratik-patidar';
        portInput.dispatchEvent(new Event('input', { bubbles: true }));
        portInput.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 9. Why question
      const whyInput = document.querySelector('textarea[name="why"]');
      if (whyInput) {
        whyInput.value = 'During a production deployment of a real-time data table, state race conditions caused intermittent client-side sync mismatches. I restructured the state using optimistic UI updates and robust request deduplication. After thorough stress testing, the pipeline became completely deterministic and reliable in production.';
        whyInput.dispatchEvent(new Event('input', { bubbles: true }));
        whyInput.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    console.log('Form prefilled successfully in live tab!');
    const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-14/anuyog_sde_prefilled.png';
    await p.screenshot({ path: screenshotPath });
    console.log('Saved screenshot:', screenshotPath);
  } catch (err) {
    console.error('Error:', err.message);
  }
})();
