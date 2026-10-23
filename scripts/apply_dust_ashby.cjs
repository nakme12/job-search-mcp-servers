const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('C:\\mcp\\job-search-mcp-engine\\candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf');
const APPLIED_FILE = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
const SCREENSHOT_DIR = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  const url = 'https://jobs.ashbyhq.com/dust/ec0ae613-e480-4d93-b89f-1d6a89db9766/application';

  try {
    console.log(`[DUST] Opening application URL: ${url}`);
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));

    // 1. Resume upload
    console.log(`[DUST] Uploading resume...`);
    const fileInput = await p.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(RESUME_PATH);
      console.log(`[DUST] Resume uploaded ✅`);
    }

    await new Promise(r => setTimeout(r, 2000));

    // 2. Fill form fields
    console.log(`[DUST] Filling fields...`);
    await p.evaluate((prof) => {
      function fireEvents(el, val) {
        el.focus();
        el.value = '';
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
      }

      const allInputs = Array.from(document.querySelectorAll('input, textarea'));
      for (const el of allInputs) {
        const label = (el.getAttribute('aria-label') || (el.labels && el.labels[0] ? el.labels[0].innerText : '') || el.placeholder || el.name || '').toLowerCase();
        const parentText = (el.closest('div') ? el.closest('div').innerText : '').toLowerCase();

        if (label.includes('name') || parentText.includes('full name')) {
          if (el.type !== 'file') fireEvents(el, prof.name);
        } else if (label.includes('email') || parentText.includes('email')) {
          fireEvents(el, prof.email);
        } else if (el.type === 'tel' || label.includes('phone') || parentText.includes('phone')) {
          fireEvents(el, prof.phone);
        } else if (label.includes('linkedin') || parentText.includes('linkedin')) {
          fireEvents(el, prof.linkedin);
        } else if (parentText.includes('showcase your craft') || parentText.includes('portfolio') || parentText.includes('github')) {
          fireEvents(el, `Portfolio: ${prof.portfolio} | GitHub: https://github.com/pratikpatidar7990`);
        } else if (parentText.includes('compensation') || parentText.includes('salary')) {
          fireEvents(el, '465000');
        } else if (parentText.includes('why do you want to join')) {
          fireEvents(el, 'I am passionate about building intuitive, high-performance web interfaces for modern AI systems. With 1.5 years of experience in React, TypeScript, and full-stack architecture, I am excited to contribute to Dust.');
        }
      }

      // Handle radios
      const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
      radios.forEach(r => {
        const parent = (r.parentElement ? r.parentElement.innerText : '').toLowerCase();
        if (parent.includes('yes')) {
          r.click();
          r.checked = true;
          r.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });

      // Handle checkboxes
      const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
      checkboxes.forEach(c => {
        c.click();
        c.checked = true;
        c.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }, PROFILE);

    await new Promise(r => setTimeout(r, 2500));

    // 3. Click Submit
    console.log(`[DUST] Clicking Submit Application button...`);
    await p.evaluate(() => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText.trim()));
      if (btn) btn.click();
    });

    console.log(`[DUST] Waiting for confirmation...`);
    await new Promise(r => setTimeout(r, 5000));

    // 4. Assert Confirmation
    const isSuccess = await p.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      return /thank you|application submitted|received your application|success/i.test(text);
    });

    console.log(`[DUST] Confirmation result: ${isSuccess}`);

    if (isSuccess) {
      const proofPath = path.join(SCREENSHOT_DIR, 'ashby_dust_applied.png');
      await p.screenshot({ path: proofPath, fullPage: true });
      console.log(`✅ [PROOF SAVED] ${proofPath}`);

      const data = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
      data.jobs.push({
        id: 'ashby_dust_' + Date.now(),
        company: 'Dust',
        role: 'Software Engineer',
        url: url,
        application_type: 'Direct ATS Portal (Ashby)',
        status: 'CONFIRMED_APPLIED',
        submitted_at: new Date().toISOString(),
        screenshot_proof: proofPath
      });
      data.total = data.jobs.length;
      fs.writeFileSync(APPLIED_FILE, JSON.stringify(data, null, 2));
      console.log(`>>> Confirmed applied logged in File 5! Total: ${data.total} <<<`);
    } else {
      console.log(`[DUST] Notice: Submit needs verification / manual click.`);
      const proofPath = path.join(SCREENSHOT_DIR, 'ashby_dust_review.png');
      await p.screenshot({ path: proofPath });
    }

    await p.close();
    console.log(`[DUST] Tab closed cleanly per Rule 57.`);
  } catch (err) {
    console.log(`[DUST] Error: ${err.message}`);
    try { await p.close(); } catch(e) {}
  }
})();
