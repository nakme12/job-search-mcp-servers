const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function prepCaptchaJob(job) {
  console.log(`\n======================================================`);
  console.log(`[CAPTCHA ASSIST] Opening & Pre-filling: ${job.company}`);
  console.log(`Role: ${job.role} | Channel: ${job.channel}`);
  console.log(`URL: ${job.url}`);
  console.log(`======================================================`);

  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.bringToFront();

  const appUrl = job.url.endsWith('/application') ? job.url : job.url.replace(/\/$/, '') + '/application';
  await page.goto(appUrl, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await new Promise(r => setTimeout(r, 2500));

  // Resume path
  const resumePath = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - React Developer.pdf';

  // Fill Ashby Form Fields
  console.log(`[${job.company}] Injecting candidate profile into form...`);
  await page.evaluate(() => {
    function setReactVal(el, val) {
      if (!el) return;
      el.focus();
      const fiberKey = Object.keys(el).find(k => k.startsWith('__reactFiber$'));
      if (fiberKey && el[fiberKey] && el[fiberKey].memoizedProps && typeof el[fiberKey].memoizedProps.onChange === 'function') {
        el[fiberKey].memoizedProps.onChange({ target: { value: val }, currentTarget: { value: val } });
      } else {
        const desc = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
        if (desc && desc.set) desc.set.call(el, val);
        else el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }
    }

    const inputs = Array.from(document.querySelectorAll('input, textarea'));
    inputs.forEach(inp => {
      const name = (inp.name || inp.id || inp.getAttribute('aria-label') || '').toLowerCase();
      const placeholder = (inp.placeholder || '').toLowerCase();
      
      if (name.includes('name') || placeholder.includes('name')) {
        setReactVal(inp, 'Pratik Patidar');
      } else if (name.includes('email') || placeholder.includes('email')) {
        setReactVal(inp, 'pratikpatidar7990@gmail.com');
      } else if (name.includes('phone') || placeholder.includes('phone')) {
        setReactVal(inp, '+918269647990');
      } else if (name.includes('linkedin') || placeholder.includes('linkedin')) {
        setReactVal(inp, 'https://www.linkedin.com/in/pratik-patidar');
      } else if (name.includes('portfolio') || name.includes('website') || placeholder.includes('portfolio') || placeholder.includes('website') || placeholder.includes('github')) {
        setReactVal(inp, 'https://pratik-portfolio-nine-orcin.vercel.app');
      }
    });
  });

  // Upload Resume
  const fileInput = await page.$('input[type="file"]');
  if (fileInput && fs.existsSync(resumePath)) {
    console.log(`[${job.company}] Uploading resume: ${resumePath}`);
    await fileInput.uploadFile(resumePath);
    await new Promise(r => setTimeout(r, 1500));
  }

  // Scroll to submit button and captcha area
  await page.evaluate(() => {
    const btn = document.querySelector('button[type="submit"]') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.toLowerCase().includes('submit'));
    if (btn) btn.scrollIntoView({ behavior: 'smooth', block: 'center' });
  });

  console.log(`\n🚨 >>> BHAI TAB IS READY & PRE-FILLED IN BRAVE! <<< 🚨`);
  console.log(`Please solve the CAPTCHA and click "Submit Application".`);
  console.log(`The script is now listening for the live confirmation on the DOM...\n`);

  // Wait for user to submit (Polling confirmation up to 90 seconds)
  let isConfirmed = false;
  const startTime = Date.now();
  const maxWaitMs = 90000;

  while (Date.now() - startTime < maxWaitMs) {
    isConfirmed = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      return text.includes('Thank you for applying') ||
             text.includes('Application submitted') ||
             text.includes('received your application') ||
             text.includes('Application Submitted') ||
             text.includes('applied successfully') ||
             text.includes('Submission received');
    });

    if (isConfirmed) {
      console.log(`\n🎉 CONFIRMATION DETECTED FOR ${job.company.toUpperCase()}! 🎉`);
      break;
    }
    await new Promise(r => setTimeout(r, 2000));
  }

  if (isConfirmed) {
    const safeName = job.company.toLowerCase().replace(/[^a-z0-9]/g, '_');
    const screenshotPath = `C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/${safeName}_ashby_confirmed.png`;
    fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
    await page.screenshot({ path: screenshotPath, fullPage: false });
    console.log(`Proof screenshot saved to: ${screenshotPath}`);

    // Update File 5
    const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
    const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
    const record = {
      company: job.company,
      role: job.role,
      url: job.url,
      channel: `${job.channel} (Rule 56 Assisted Apply)`,
      proof_screenshot: screenshotPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    };
    file5.jobs.push(record);
    file5.total = file5.jobs.length;
    fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');

    // Remove from skipped list
    const skippedPath = 'C:/mcp/job-search-mcp-engine/data/daily/already_applied_or_skipped_todays_2026-10-23.json';
    let skipped = JSON.parse(fs.readFileSync(skippedPath, 'utf8'));
    skipped = skipped.filter(j => j.company !== job.company);
    fs.writeFileSync(skippedPath, JSON.stringify(skipped, null, 2), 'utf8');

    console.log(`[FILE 5] Updated! Total applied confirmed today: ${file5.total}`);
    await page.close();
  } else {
    console.log(`[${job.company}] Timeout (90s elapsed without confirmation). Leaving tab open for user.`);
  }

  await browser.disconnect();
}

const targetJob = {
  company: "Plane Software, Inc.",
  role: "Software Engineer, Frontend (React)",
  url: "https://jobs.ashbyhq.com/plane/15cf6387-af74-4616-924f-3659fb76de01/application",
  channel: "Ashby"
};

prepCaptchaJob(targetJob).catch(console.error);
