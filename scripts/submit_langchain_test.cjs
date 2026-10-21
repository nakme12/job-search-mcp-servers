const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';
  const url = 'https://jobs.ashbyhq.com/langchain/ddf92275-1cc3-49c0-9f25-e8ded43b07f6/application';

  console.log('Navigating to LangChain application...');
  await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 3500));

  console.log('1. Uploading resume via CDP file input...');
  const fileInputs = await p.$$('input[type="file"]');
  for (const fi of fileInputs) {
    try {
      await fi.uploadFile(RESUME_PATH);
      console.log('Resume uploaded to input.');
    } catch (e) {}
  }
  await new Promise(r => setTimeout(r, 2000));

  console.log('2. Populating fields via React 18 prototype setters...');
  const fillRes = await p.evaluate(() => {
    const inputSetter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    const textareaSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set;

    function setReactVal(el, val) {
      if (!el) return;
      if (el.tagName === 'TEXTAREA') textareaSetter.call(el, val);
      else inputSetter.call(el, val);
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    const filled = [];
    const nameInp = document.querySelector('input[name="_systemfield_name"]');
    if (nameInp) { setReactVal(nameInp, 'Pratik Patidar'); filled.push('name'); }

    const emailInp = document.querySelector('input[name="_systemfield_email"]');
    if (emailInp) { setReactVal(emailInp, 'pratikpatidar7990@gmail.com'); filled.push('email'); }

    // All text inputs
    const allInputs = Array.from(document.querySelectorAll('input[type="text"]'));
    for (const inp of allInputs) {
      const lbl = (inp.labels && inp.labels[0] ? inp.labels[0].innerText : (inp.getAttribute('aria-label') || inp.placeholder || '')).toLowerCase();
      if (lbl.includes('github')) {
        setReactVal(inp, 'https://github.com/pratikpatidar');
        filled.push('github');
      } else if (lbl.includes('linkedin')) {
        setReactVal(inp, 'https://www.linkedin.com/in/pratik-patidar');
        filled.push('linkedin');
      } else if (lbl.includes('start typing') || lbl.includes('location')) {
        setReactVal(inp, 'Indore, India');
        filled.push('location');
      }
    }

    // Sponsorship radio: Yes
    const btns = Array.from(document.querySelectorAll('button'));
    const yesBtn = btns.find(b => b.innerText.trim().toLowerCase() === 'yes');
    if (yesBtn) {
      yesBtn.click();
      filled.push('sponsorship_yes');
    }

    return { filled };
  });

  console.log('Fill result:', fillRes);
  await new Promise(r => setTimeout(r, 2000));

  // Check for any red errors before submit
  const preSubmitErrors = await p.evaluate(() => {
    const errs = Array.from(document.querySelectorAll('*')).filter(el => {
      const cls = typeof el.className === 'string' ? el.className.toLowerCase() : '';
      return cls.includes('error') || el.getAttribute('aria-invalid') === 'true';
    });
    return Array.from(new Set(errs.map(e => e.innerText ? e.innerText.trim() : '').filter(t => t.length > 0 && t.length < 100)));
  });
  console.log('Pre-submit errors:', preSubmitErrors);

  console.log('3. Clicking Submit Application...');
  const submitClicked = await p.evaluate(() => {
    const b = Array.from(document.querySelectorAll('button')).find(x => /submit application/i.test(x.innerText));
    if (b) {
      b.scrollIntoView({ behavior: 'instant', block: 'center' });
      b.click();
      return true;
    }
    return false;
  });
  console.log('Submit button clicked?', submitClicked);

  console.log('4. Waiting 8s for live confirmation...');
  await new Promise(r => setTimeout(r, 8000));

  const finalState = await p.evaluate(() => {
    const text = document.body ? document.body.innerText : '';
    const isSuccess = /thank you|application submitted|received your application|success/i.test(text);
    return {
      title: document.title,
      url: window.location.href,
      isSuccess,
      snippet: text.slice(0, 500)
    };
  });

  console.log('Final State:\n', JSON.stringify(finalState, null, 2));

  if (finalState.isSuccess) {
    const proofPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\ashby_langchain_applied.png';
    await p.screenshot({ path: proofPath, fullPage: true });
    console.log(`✅ CONFIRMED APPLIED! Screenshot saved: ${proofPath}`);

    // Update applied_todays
    const appliedPath = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      id: 'ashby_langchain_' + Date.now(),
      company: 'LangChain',
      role: 'FullStack Engineer, AI Observability & Evals Platform',
      url: url,
      application_type: 'Direct ATS Portal (Ashby)',
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
    console.log('⚠️ Not yet confirmed. Keeping tab open for inspection.');
  }
})();
