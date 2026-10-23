const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let p = pages.find(page => page.url().includes('jobs.ashbyhq.com/langchain/eadd2a71'));
  const url = 'https://jobs.ashbyhq.com/langchain/eadd2a71-47fc-483b-948f-4b2384f7f93f/application';
  const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';

  if (!p) {
    p = await browser.newPage();
    console.log('Navigating to LangChain Agent Systems application...');
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3500));
  } else {
    console.log('Using already open LangChain Role 2 tab...');
  }

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

    // All custom inputs
    const customInputs = Array.from(document.querySelectorAll('input[type="text"]:not([name^="_systemfield"]), textarea:not([name="g-recaptcha-response"])'));
    for (const inp of customInputs) {
      // Find nearest container text
      let container = inp.closest('[class*="field"], [class*="question"], div');
      let text = '';
      let cur = inp;
      for (let i = 0; i < 4; i++) {
        if (cur.parentElement) {
          text += ' ' + cur.parentElement.innerText;
          cur = cur.parentElement;
        }
      }
      text = text.toLowerCase();

      if (text.includes('portfolio') || text.includes('github') || text.includes('website') || customInputs.length === 1) {
        setReactVal(inp, 'https://pratik-portfolio-nine-orcin.vercel.app');
        filled.push('portfolio');
      } else if (text.includes('linkedin')) {
        setReactVal(inp, 'https://www.linkedin.com/in/pratik-patidar');
        filled.push('linkedin');
      } else if (text.includes('location') || text.includes('typing')) {
        setReactVal(inp, 'Indore, India');
        filled.push('location');
      }
    }

    return { filled };
  });

  console.log('Fill result:', fillRes);
  await new Promise(r => setTimeout(r, 1500));

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
    const proofPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\ashby_langchain_agent_systems_applied.png';
    await p.screenshot({ path: proofPath, fullPage: true });
    console.log(`✅ CONFIRMED APPLIED! Screenshot saved: ${proofPath}`);

    // Update applied_todays
    const appliedPath = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      id: 'ashby_langchain_agent_' + Date.now(),
      company: 'LangChain',
      role: 'Software Engineer, Agent Systems (GTM Engineering)',
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
