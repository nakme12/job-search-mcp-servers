const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
const RESUMES_DIR = path.resolve('resumes');

function getResume(roleTitle) {
  const t = (roleTitle || '').toLowerCase();
  if (t.includes('full stack') || t.includes('mern') || t.includes('node') || t.includes('backend')) {
    return path.join(RESUMES_DIR, 'Pratik Patidar Resume - MERN Full Stack.pdf');
  }
  if (t.includes('react') || t.includes('ui') || t.includes('front end') || t.includes('frontend')) {
    return path.join(RESUMES_DIR, 'Pratik Patidar Resume - React Developer.pdf');
  }
  return path.join(RESUMES_DIR, 'Pratik Patidar Resume - Frontend Engineer.pdf');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const job = {
    company: 'Cursor',
    role: 'Software Engineer, Research Tooling',
    url: 'https://jobs.ashbyhq.com/cursor/fa7a821b-ca2b-43fe-8942-07f215a060c7/application'
  };

  console.log(`[Job 1/Batch] ${job.company} — Portal URL open kiya: ${job.url}`);
  try {
    await page.goto(job.url, { waitUntil: 'networkidle2', timeout: 35000 });
    await sleep(3000);

    const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '');
    console.log(`Page title:`, await page.title());
    if (/this job is no longer available|position has been closed|404/i.test(bodyText)) {
      console.log(`[Job 1/Batch] ${job.company} — ERROR: Role closed / unavailable — SKIPPED`);
      await page.close();
      process.exit(0);
    }
    console.log(`[Job 1/Batch] ${job.company} — JD verify kiya (Active ATS Portal) ✅`);

    // Check form fields
    const formInputs = await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      return inputs.map(i => ({
        tagName: i.tagName,
        type: i.type,
        name: i.name,
        id: i.id,
        placeholder: i.placeholder,
        label: i.labels && i.labels[0] ? i.labels[0].innerText : ''
      }));
    });
    console.log(`Found ${formInputs.length} inputs on page.`);
    console.log(JSON.stringify(formInputs.slice(0, 15), null, 2));

    // Upload resume
    const resumePath = getResume(job.role);
    console.log(`[Job 1/Batch] ${job.company} — Uploading resume: ${path.basename(resumePath)}`);
    const fileInput = await page.$('input[type="file"]');
    if (fileInput) {
      await fileInput.uploadFile(resumePath);
      console.log(`Resume injected.`);
      await sleep(2500);
    } else {
      console.log(`Warning: input[type="file"] not found!`);
    }

    // Fill standard fields
    console.log(`[Job 1/Batch] ${job.company} — Form fill: Name / Email / Phone / Links`);
    await page.evaluate((prof) => {
      function setNativeVal(el, val) {
        if (!el) return;
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        el.value = '';
        el.value = val;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // 1. Direct system fields
      setNativeVal(document.querySelector('input[name="_systemfield_name"], input[id="_systemfield_name"]'), prof.name);
      setNativeVal(document.querySelector('input[name="_systemfield_email"], input[id="_systemfield_email"]'), prof.email);
      
      const phoneInput = document.querySelector('input[type="tel"]') || document.querySelector('input[name*="phone" i]') || document.querySelector('input[id*="phone" i]');
      if (phoneInput) {
        setNativeVal(phoneInput, prof.phone);
      }

      // All inputs
      const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"], textarea'));
      allInputs.forEach(inp => {
        let label = (inp.getAttribute('aria-label') || (inp.labels && inp.labels[0] ? inp.labels[0].innerText : '') || inp.placeholder || inp.name || inp.id || '').toLowerCase();
        let parentText = (inp.parentElement ? inp.parentElement.innerText : '').toLowerCase();
        let combined = label + ' ' + parentText;

        if (combined.includes('linkedin')) {
          setNativeVal(inp, prof.linkedin);
        } else if (combined.includes('github')) {
          setNativeVal(inp, prof.github);
        } else if (combined.includes('portfolio') || combined.includes('website')) {
          setNativeVal(inp, prof.portfolio);
        } else if (combined.includes('location') || combined.includes('residing') || combined.includes('city')) {
          setNativeVal(inp, 'Indore, India (Open to Relocate / Remote)');
        }
      });
    }, PROFILE);

    await sleep(2000);

    // Check CAPTCHA
    const captchaDetected = await page.evaluate(() => {
      return !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], textarea[name="g-recaptcha-response"]');
    });
    console.log(`[Job 1/Batch] ${job.company} — CAPTCHA check result: ${captchaDetected ? 'DETECTED' : 'NONE'}`);

    if (captchaDetected) {
      console.log(`🚨 CAPTCHA ALERT: Cursor application requires CAPTCHA verification! Tab held open.`);
      await page.bringToFront();
      process.exit(1);
    }

    // Check Submit button
    const submitBtn = await page.$('.ashby-application-form-submit-button, button[type="submit"]');
    if (submitBtn) {
      console.log(`[Job 1/Batch] ${job.company} — Submit button found.`);
      await submitBtn.evaluate(el => el.scrollIntoView({ behavior: 'smooth', block: 'center' }));
      await sleep(1000);
      console.log(`[Job 1/Batch] ${job.company} — Submit click kiya`);
      await submitBtn.click();
      await sleep(5000);

      // Validation check
      const pageText = await page.evaluate(() => document.body ? document.body.innerText : '');
      const isConfirmed = /thank you|application submitted|received your application|success|we have received/i.test(pageText);

      if (isConfirmed) {
        console.log(`[Job 1/Batch] ${job.company} — Confirmation detected ✅ Screenshot saving...`);
        const vaultDir = path.resolve('screenshots/2026-10-21/shift1');
        const proofPath = path.join(vaultDir, `ashby_cursor_applied.png`);
        await page.screenshot({ path: proofPath, fullPage: true });
        console.log(`Screenshot saved at: ${proofPath}`);

        // Update applied_todays_2026-10-21.json
        const appliedFile = path.resolve('applied_todays_2026-10-21.json');
        let appliedData = {
          date: '2026-10-21',
          shift: 1,
          cycle: 1,
          description: 'Confirmed submissions on 2026-10-21 with live DOM confirmation & physical screenshot proof',
          total: 0,
          jobs: []
        };
        if (fs.existsSync(appliedFile)) {
          try {
            const raw = JSON.parse(fs.readFileSync(appliedFile, 'utf8'));
            if (Array.isArray(raw)) {
              appliedData.jobs = raw;
            } else if (raw && Array.isArray(raw.jobs)) {
              appliedData = raw;
            }
          } catch (e) {}
        }
        appliedData.jobs.push({
          id: 'ashby_cursor_' + Date.now(),
          company: 'Cursor',
          role: job.role,
          url: job.url,
          application_type: 'Direct ATS / Career Portal (Ashby)',
          resume_attached: path.basename(resumePath),
          status: 'CONFIRMED_APPLIED',
          submitted_at: new Date().toISOString(),
          screenshot_proof: proofPath
        });
        appliedData.total = appliedData.jobs.length;
        fs.writeFileSync(appliedFile, JSON.stringify(appliedData, null, 2));
        console.log(`[Job 1/Batch] Cursor applied successfully logged to applied_todays_2026-10-21.json! Total applied: ${appliedData.total}`);
        
        // Immediate close tab
        await page.close();
        console.log(`[Job 1/Batch] Tab closed.`);
      } else {
        console.log(`[Job 1/Batch] Cursor — Form validation or additional required fields pending. Inspecting page...`);
        console.log(pageText.slice(0, 1000));
      }
    } else {
      console.log(`Submit button not found directly.`);
    }

  } catch (err) {
    console.error(`Error:`, err);
  }
}

main();
