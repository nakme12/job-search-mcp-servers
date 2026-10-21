const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - Frontend Engineer.pdf';
const APPLIED_FILE = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
const SCREENSHOT_DIR = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  const url = 'https://www.zaax.com/submit-resume/';

  try {
    console.log(`[ZAAX] Opening direct portal: ${url}`);
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 35000 });
    await new Promise(r => setTimeout(r, 4000));

    // 1. Upload resume file
    console.log(`[ZAAX] Uploading resume to #vita_file...`);
    const fileInput = await p.$('#vita_file') || await p.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(RESUME_PATH);
      console.log(`[ZAAX] Resume uploaded successfully!`);
    }

    await new Promise(r => setTimeout(r, 1500));

    // 2. Fill all inputs and selects
    console.log(`[ZAAX] Populating form fields...`);
    await p.evaluate(() => {
      function setVal(id, val) {
        const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        if (!el) return;
        el.focus();
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
        el.blur();
      }

      function setSelect(id, val) {
        const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
        if (!el) return;
        el.value = val;
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Personal details
      setVal('candidate_name', 'Pratik Patidar');
      setVal('email', 'pratikpatidar7990@gmail.com');
      setVal('mobile', '8269647990');
      setVal('dob', '2001-05-15');
      setSelect('gender', 'Male');
      setSelect('marital_status', 'Single');
      setVal('nationality', 'Indian');

      // Address
      setVal('address', 'Indore, Madhya Pradesh');
      setVal('city', 'Indore');
      setVal('state', 'Madhya Pradesh');
      setSelect('country2', 'India');
      setVal('pincode', '452001');

      // Education & Tech
      setSelect('qualification', 'BE / BTech');
      setSelect('passingyr', '2024');
      setSelect('tecnology', 'React');
      setSelect('pskills', 'React');
      setVal('others', 'Next.js, TypeScript, JavaScript, REST APIs, Tailwind CSS, Node.js');

      // Role & Experience
      setSelect('postfor', 'Front End Developer');
      setVal('currentcompany', 'Full Stack / Frontend Developer');
      setSelect('texp', '1-2 Years');
      setSelect('rexp', '1-2 Years');
      setVal('clocation', 'Indore');
      setVal('loc_pre', 'Remote / PAN India');

      // Checkbox source
      const src = document.getElementById('source1');
      if (src) {
        src.checked = true;
        src.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise(r => setTimeout(r, 2000));

    // Pre-submit screenshot for audit
    const preSubmitPath = path.join(SCREENSHOT_DIR, 'zaax_pre_submit.png');
    await p.screenshot({ path: preSubmitPath, fullPage: true });
    console.log(`[ZAAX] Pre-submit audit screenshot saved: ${preSubmitPath}`);

    // 3. Click Submit
    console.log(`[ZAAX] Clicking Submit Application button...`);
    await p.evaluate(() => {
      const btn = document.querySelector('button[type="submit"]') || 
                  document.querySelector('input[type="submit"]') || 
                  Array.from(document.querySelectorAll('button, input')).find(b => /submit/i.test(b.value || b.innerText));
      if (btn) btn.click();
    });

    console.log(`[ZAAX] Waiting for submission response...`);
    await new Promise(r => setTimeout(r, 6000));

    // 4. Assert Live Confirmation
    const result = await p.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isSuccess = /thank you|resume submitted|application received|submitted successfully|success/i.test(text);
      return { isSuccess, url: window.location.href };
    });

    console.log(`[ZAAX] Confirmation result: ${result.isSuccess} | URL: ${result.url}`);

    if (result.isSuccess) {
      const proofPath = path.join(SCREENSHOT_DIR, 'zaax_direct_portal_applied.png');
      await p.screenshot({ path: proofPath, fullPage: true });
      console.log(`✅ [PROOF SAVED] ${proofPath}`);

      const data = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
      data.jobs.push({
        id: 'zaax_direct_' + Date.now(),
        company: 'ZAAX Consulting',
        role: 'Front End Developer',
        url: url,
        application_type: 'Direct Company Career Site (Form Submission)',
        status: 'CONFIRMED_APPLIED',
        submitted_at: new Date().toISOString(),
        screenshot_proof: proofPath
      });
      data.total = data.jobs.length;
      fs.writeFileSync(APPLIED_FILE, JSON.stringify(data, null, 2));
      console.log(`>>> [FILE 5 UPDATED] Confirmed total applied today: ${data.total} <<<`);
    } else {
      console.log(`[ZAAX] Post-submit review screenshot saving...`);
      const postSubmitPath = path.join(SCREENSHOT_DIR, 'zaax_post_submit_review.png');
      await p.screenshot({ path: postSubmitPath, fullPage: true });
      console.log(`Saved review to: ${postSubmitPath}`);
    }

    await p.close();
    console.log(`[ZAAX] Tab closed cleanly per Rule 57.`);
  } catch (err) {
    console.log(`[ZAAX] Error: ${err.message}`);
    try { await p.close(); } catch(e) {}
  }
})();
