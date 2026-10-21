const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let p = pages.find(page => page.url().includes('cursor.com/careers'));
  if (!p) {
    console.log('No Cursor careers tab found.');
    return;
  }
  const url = 'https://cursor.com/careers/forward-deployed-engineer-india';

  console.log('1. Uploading resume to Cursor form...');
  const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';
  const fileInputs = await p.$$('input[type="file"]');
  for (const fi of fileInputs) {
    try {
      await fi.uploadFile(RESUME_PATH);
      console.log('Resume file injected into input.');
    } catch (e) {
      console.log('File upload error:', e.message);
    }
  }
  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Populating fields on Cursor form...');
  const fillResult = await p.evaluate(() => {
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

    function setVal(el, val) {
      if (!el) return false;
      if (el.tagName === 'TEXTAREA') textareaSetter.call(el, val);
      else inputSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    const report = {};

    // 1. Name & Email
    report.name = setVal(document.getElementById('_systemfield_name'), 'Pratik Patidar');
    report.email = setVal(document.getElementById('_systemfield_email'), 'pratikpatidar7990@gmail.com');

    // 2. LinkedIn URL
    report.linkedin = setVal(document.getElementById('76ac8c89-d8e8-4972-ba61-ad938053fe0d'), 'https://www.linkedin.com/in/pratik-patidar');

    // 3. GitHub Profile
    report.github = setVal(document.getElementById('8cad46b3-4fae-489b-b26b-5d6dc44fa4b7'), 'https://github.com/pratikpatidar');

    // 4. Convinced technical audience textarea
    const textarea = document.getElementById('c9104c7d-2dc6-4b6f-8edd-7a4e26a77734');
    report.textarea = setVal(
      textarea,
      'When modernizing our frontend stack, the team was hesitant to adopt React 18 and Next.js due to migration overhead concerns. I built a prototype demonstrating a 40% reduction in initial page load time and simplified state management with Server Components and custom hooks. Walking through concrete performance metrics and modular incremental migration steps convinced the team to make the switch smoothly.'
    );

    // 5. Visa sponsorship: "No"
    const radioLabels = Array.from(document.querySelectorAll('label'));
    const noLabel = radioLabels.find(l => l.innerText.trim() === 'No');
    if (noLabel) {
      noLabel.click();
      report.sponsorshipNo = true;
    } else {
      const noRadio = Array.from(document.querySelectorAll('input[type="radio"]')).find(r => {
        const p = r.closest('label') || r.parentElement;
        return p && p.innerText.includes('No');
      });
      if (noRadio) { noRadio.click(); report.sponsorshipNo = true; }
    }

    return report;
  });

  console.log('Fill result:\n', JSON.stringify(fillResult, null, 2));
  await new Promise(r => setTimeout(r, 2000));

  console.log('3. Clicking Submit application button...');
  const submitClicked = await p.evaluate(() => {
    const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText));
    if (btn) {
      btn.scrollIntoView({ behavior: 'instant', block: 'center' });
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Submit button clicked?', submitClicked);

  console.log('4. Waiting 8s for live confirmation...');
  await new Promise(r => setTimeout(r, 8000));

  const finalState = await p.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const isSuccess = /thank you|application submitted|received your application|success|we've received your application/i.test(text);
    return {
      title: document.title,
      url: window.location.href,
      isSuccess,
      snippet: text.slice(0, 600)
    };
  });

  console.log('Final State:\n', JSON.stringify(finalState, null, 2));

  if (finalState.isSuccess) {
    const proofPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\cursor_forward_deployed_applied.png';
    await p.screenshot({ path: proofPath, fullPage: true });
    console.log(`✅ CONFIRMED APPLIED! Screenshot saved: ${proofPath}`);

    // Update applied_todays
    const appliedPath = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      id: 'cursor_fde_' + Date.now(),
      company: 'Cursor (Anysphere)',
      role: 'Forward Deployed Engineer - India',
      url: url,
      application_type: 'Direct ATS Portal (Cursor Careers / Ashby)',
      status: 'CONFIRMED_APPLIED',
      submitted_at: new Date().toISOString(),
      screenshot_proof: proofPath
    });
    appliedData.total = appliedData.jobs.length;
    fs.writeFileSync(appliedPath, JSON.stringify(appliedData, null, 2));
    console.log(`Updated applied_todays_2026-10-19.json! Total applied now: ${appliedData.total}`);

    await p.close();
    console.log('Tab closed per Rule 57.');
  } else {
    console.log('⚠️ Not yet confirmed. Keeping tab open.');
  }
})();
