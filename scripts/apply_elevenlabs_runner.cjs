const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const PROFILE = JSON.parse(fs.readFileSync('candidate_screening_profile.json', 'utf8')).profile;
const RESUME_PATH = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const page = pages.find(p => p.url().includes('elevenlabs'));
  if (!page) {
    console.error('Elevenlabs tab not found');
    process.exit(1);
  }

  console.log(`[Job 2/Batch] Elevenlabs — Setting up form fields...`);

  // Upload Resume to the application file input
  console.log(`[Job 2/Batch] Elevenlabs — Injecting Resume: ${path.basename(RESUME_PATH)}`);
  const fileInputs = await page.$$('input[type="file"]');
  console.log(`Found ${fileInputs.length} file inputs.`);
  if (fileInputs.length > 0) {
    // Usually second file input is the main resume input if there is autofill, or test both
    for (const fi of fileInputs) {
      try {
        await fi.uploadFile(RESUME_PATH);
        console.log(`Resume uploaded to file input.`);
      } catch (e) {
        console.log(`Error uploading:`, e.message);
      }
    }
    await sleep(2500);
  }

  // Pre-clear and fill standard fields per Rule 70
  console.log(`[Job 2/Batch] Elevenlabs — Form fill: Name / Email / Location / Socials / Screening`);
  await page.evaluate((prof) => {
    function setNative(el, val) {
      if (!el) return;
      el.focus();
      el.value = '';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.value = val;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    // Name & Email
    const nameInput = document.querySelector('input[name="_systemfield_name"], input[id="_systemfield_name"]');
    if (nameInput) setNative(nameInput, prof.name);

    const emailInput = document.querySelector('input[name="_systemfield_email"], input[id="_systemfield_email"]');
    if (emailInput) setNative(emailInput, prof.email);

    // Dynamic inputs & textareas
    const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="url"], textarea'));
    allInputs.forEach(inp => {
      let label = (inp.getAttribute('aria-label') || inp.placeholder || inp.name || inp.id || '').toLowerCase();
      let parent = inp.closest('div[class*="field"], div, label');
      let parentText = (parent ? parent.innerText : '').toLowerCase();
      let combined = label + ' ' + parentText;

      if (combined.includes('github')) {
        setNative(inp, prof.github);
      } else if (combined.includes('linkedin')) {
        setNative(inp, prof.linkedin);
      } else if (combined.includes('location') || combined.includes('residing')) {
        setNative(inp, 'India');
      } else if (combined.includes('mission') || combined.includes('excited about')) {
        setNative(inp, 'ElevenLabs is pioneering the next generation of generative audio and real-time voice AI. I am deeply excited about the challenge of building ultra-low-latency, interactive creative tools with intuitive, lightning-fast frontend interfaces that empower musicians and creators worldwide.');
      } else if (combined.includes('hard problem') || combined.includes('achievement')) {
        setNative(inp, 'Engineered an interactive, real-time audio/data dashboard in React.js and TypeScript utilizing WebSockets and state memoization. Overcame significant client-side rendering bottlenecks caused by high-frequency stream updates by introducing batched rendering and optimized DOM diffing, reducing frame drops to 0 and maintaining sub-50ms UI response times.');
      } else if (combined.includes('other (please specify)') || combined.includes('if other')) {
        setNative(inp, 'LinkedIn Job Board / Professional Network');
      }
    });

    // Radio: "LinkedIn" or "Other" for How did you hear
    const radios = Array.from(document.querySelectorAll('input[type="radio"]'));
    for (const r of radios) {
      const p = r.closest('label') || r.parentElement;
      const t = (p ? p.innerText : '').toLowerCase();
      if (t.includes('linkedin')) {
        r.click();
        r.checked = true;
        r.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
    }
  }, PROFILE);

  await sleep(2000);

  // Check form values
  const checkValues = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('input, textarea')).map(el => ({
      name: el.name,
      id: el.id,
      type: el.type,
      val: el.value ? el.value.slice(0, 30) : ''
    })).filter(x => x.type !== 'hidden' && x.type !== 'file');
  });
  console.log(`[Job 2/Batch] Elevenlabs populated fields:`, checkValues);

  // Check CAPTCHA
  const hasCaptcha = await page.evaluate(() => {
    return !!document.querySelector('.g-recaptcha, iframe[src*="recaptcha"], iframe[src*="turnstile"], iframe[src*="hcaptcha"], textarea[name="g-recaptcha-response"]');
  });
  console.log(`[Job 2/Batch] Elevenlabs — CAPTCHA check result: ${hasCaptcha ? 'DETECTED' : 'NONE'}`);

  // Bring to front
  await page.bringToFront();

  // Try Submitting
  console.log(`[Job 2/Batch] Elevenlabs — Clicking Submit Application...`);
  const submitBtn = await page.$('button[type="submit"]');
  if (submitBtn) {
    await submitBtn.evaluate(b => b.scrollIntoView({ behavior: 'smooth', block: 'center' }));
    await sleep(1000);
    await submitBtn.click();
    console.log(`Submit button clicked.`);
    await sleep(6000);

    const postSubmitText = await page.evaluate(() => document.body ? document.body.innerText : '');
    const isConfirmed = /thank you|application submitted|received your application|success|we have received/i.test(postSubmitText);
    console.log(`Confirmation detected: ${isConfirmed}`);

    if (isConfirmed) {
      console.log(`✅ [Job 2/Batch] Elevenlabs — Application Submitted Successfully!`);
      const vaultDir = path.resolve('screenshots/2026-10-21/shift1');
      const proofPath = path.join(vaultDir, 'ashby_elevenlabs_applied.png');
      await page.screenshot({ path: proofPath, fullPage: true });
      console.log(`Screenshot saved at: ${proofPath}`);

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
          if (Array.isArray(raw)) appliedData.jobs = raw;
          else if (raw && Array.isArray(raw.jobs)) appliedData = raw;
        } catch (e) {}
      }

      appliedData.jobs.push({
        id: 'ashby_elevenlabs_' + Date.now(),
        company: 'Elevenlabs',
        role: 'Full-Stack Engineer (Frontend-Leaning) - CreativeMusic',
        url: 'https://jobs.ashbyhq.com/elevenlabs/38bac641-02de-414d-96f3-d0adb603cb89/application',
        application_type: 'Direct ATS / Career Portal (Ashby)',
        resume_attached: path.basename(RESUME_PATH),
        status: 'CONFIRMED_APPLIED',
        submitted_at: new Date().toISOString(),
        screenshot_proof: proofPath
      });
      appliedData.total = appliedData.jobs.length;
      fs.writeFileSync(appliedFile, JSON.stringify(appliedData, null, 2));
      console.log(`Logged to applied_todays_2026-10-21.json! Total applied: ${appliedData.total}`);

      await page.close();
      console.log(`Tab closed.`);
    } else {
      console.log(`Form may have reCAPTCHA challenge or validation errors requiring solve.`);
      console.log(`Page excerpt:`, postSubmitText.slice(0, 500));
    }
  }
}

main().catch(console.error);
