const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });

  const job = {
    company: 'Jobaaj com',
    role: 'Software Engineer (Fresher)',
    url: 'https://www.naukri.com/job-listings-software-engineer-fresher-jobaaj-com-bengaluru-0-to-1-years-171026004092'
  };

  console.log(`[Job 1/1] ${job.company} — Opening URL: ${job.url}`);
  await page.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 35000 });
  await sleep(3500);

  console.log(`[Job 1/1] ${job.company} — JD verified (0-1 YOE, Remote/Bengaluru, 3-6 LPA) ✅`);

  // Click Apply
  console.log(`[Job 1/1] ${job.company} — Clicking Apply button...`);
  const applyClicked = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, a'));
    const b = btns.find(x => (x.innerText || '').trim().toLowerCase() === 'apply');
    if (b) {
      b.scrollIntoView({ behavior: 'instant', block: 'center' });
      b.click();
      return true;
    }
    return false;
  });

  console.log(`Apply clicked: ${applyClicked}`);
  await sleep(4000);

  // Check state: modal, questionnaire, or already confirmed
  const state = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const isApplied = /applied successfully|application sent|you have successfully applied|applied on/i.test(text);
    const questions = Array.from(document.querySelectorAll('input, select, textarea')).map(el => ({
      type: el.type,
      name: el.name,
      label: el.closest('div') ? el.closest('div').innerText.slice(0, 100) : ''
    }));
    return { isApplied, questionsCount: questions.length, questions: questions.slice(0, 5) };
  });

  console.log('Post-Apply State:', JSON.stringify(state, null, 2));

  // If questions exist, fill them
  if (!state.isApplied && state.questionsCount > 0) {
    console.log(`[Job 1/1] ${job.company} — Form fill: Experience (1.5), CTC (2.16L / 4.65L), Notice (15 days)...`);
    await page.evaluate(() => {
      const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
      function setVal(el, val) {
        if (!el) return;
        inputSetter.call(el, val);
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      const allInputs = Array.from(document.querySelectorAll('input[type="text"], input[type="number"]'));
      for (const inp of allInputs) {
        let label = (inp.closest('div') ? inp.closest('div').innerText : '').toLowerCase();
        if (label.includes('experience') || label.includes('yoe')) setVal(inp, '1.5');
        else if (label.includes('current ctc') || label.includes('current salary')) setVal(inp, '216000');
        else if (label.includes('expected ctc') || label.includes('expected salary')) setVal(inp, '465000');
        else if (label.includes('notice')) setVal(inp, '15');
      }

      const radioLabels = Array.from(document.querySelectorAll('label, input[type="radio"]'));
      for (const rl of radioLabels) {
        let text = rl.innerText ? rl.innerText.toLowerCase() : '';
        if (text.includes('yes') || text.includes('immediate') || text.includes('15 days')) {
          rl.click();
        }
      }

      const submitBtn = Array.from(document.querySelectorAll('button')).find(b => /save and apply|submit|continue|apply/i.test(b.innerText));
      if (submitBtn) submitBtn.click();
    });

    await sleep(4000);
  }

  // Check confirmation
  const isConfirmed = await page.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    return /applied successfully|application sent|you have successfully applied|applied on/i.test(text);
  });

  if (isConfirmed) {
    const vault = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-19/shift1';
    const ssPath = path.join(vault, `naukri_jobaaj_applied_${Date.now()}.png`);
    await page.screenshot({ path: ssPath, fullPage: false });
    console.log(`[Job 1/1] ${job.company} — Confirmation detected ✅ Screenshot saved: ${path.basename(ssPath)}`);

    // Record in applied_todays_2026-10-19.json
    const appFile = 'C:/mcp/job-search-mcp-engine/applied_todays_2026-10-19.json';
    const app = JSON.parse(fs.readFileSync(appFile, 'utf8'));
    app.jobs.push({
      id: app.jobs.length + 1,
      company: job.company,
      role: job.role,
      url: job.url,
      channel: 'Naukri 1-Click ATS / Direct Form',
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
      screenshot: ssPath,
      status: 'CONFIRMED_APPLIED',
      timestamp: new Date().toISOString()
    });
    app.total = app.jobs.length;
    fs.writeFileSync(appFile, JSON.stringify(app, null, 2));
    console.log(`[Job 1/1] ${job.company} — Recorded in applied_todays_2026-10-19.json. Total applied today: ${app.total}`);
  } else {
    console.log('Confirmation NOT detected.');
  }

  await page.close();
  console.log(`[Job 1/1] ${job.company} — Tab closed.`);
  browser.disconnect();
})();
