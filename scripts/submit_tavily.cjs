const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let p = pages.find(page => page.url().includes('jobs.ashbyhq.com/tavily'));
  const url = 'https://jobs.ashbyhq.com/tavily/58948731-c993-4127-a723-a96b1dcd841c/application';
  const RESUME_PATH = 'C:\\mcp\\job-search-mcp-engine\\resumes\\Pratik Patidar Resume - MERN Full Stack.pdf';

  if (!p) {
    p = await browser.newPage();
    console.log('Navigating to Tavily Software Engineer application...');
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 3500));
  } else {
    console.log('Using already open Tavily tab...');
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

    // 1. Explicit system fields
    const nameInp = document.querySelector('input[name="_systemfield_name"]');
    if (nameInp) {
      setReactVal(nameInp, 'Pratik Patidar');
      filled.push('name: Pratik Patidar');
    }

    const emailInp = document.querySelector('input[name="_systemfield_email"]');
    if (emailInp) {
      setReactVal(emailInp, 'pratikpatidar7990@gmail.com');
      filled.push('email: pratikpatidar7990@gmail.com');
    }

    // 2. Specific field by type / name
    const numInp = document.querySelector('input[type="number"]');
    if (numInp) {
      // Tavily requires integer or 1.5/2
      setReactVal(numInp, '2');
      filled.push('experience_num: 2');
    }

    // 3. Other text inputs (excluding name and email!)
    const textInputs = Array.from(document.querySelectorAll('input[type="text"]')).filter(
      inp => inp.name !== '_systemfield_name' && inp.name !== '_systemfield_email'
    );

    for (const inp of textInputs) {
      let labelText = '';
      let parent = inp.parentElement;
      for (let i = 0; i < 3; i++) {
        if (parent) {
          labelText += ' ' + parent.innerText;
          parent = parent.parentElement;
        }
      }
      labelText = labelText.toLowerCase();

      if (labelText.includes('linkedin')) {
        setReactVal(inp, 'https://www.linkedin.com/in/pratik-patidar');
        filled.push('linkedin');
      } else if (labelText.includes('github') || labelText.includes('portfolio') || labelText.includes('website')) {
        setReactVal(inp, 'https://github.com/pratikpatidar');
        filled.push('github');
      }
    }

    return { filled };
  });

  console.log('Fill result:', fillRes);
  await new Promise(r => setTimeout(r, 1500));

  console.log('3. Clicking Submit Application...');
  const submitClicked = await p.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const b = btns.find(x => /submit application/i.test(x.innerText));
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
      snippet: text.slice(0, 600)
    };
  });

  console.log('Final State:\n', JSON.stringify(finalState, null, 2));

  if (finalState.isSuccess) {
    const proofPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\ashby_tavily_applied.png';
    await p.screenshot({ path: proofPath, fullPage: true });
    console.log(`✅ CONFIRMED APPLIED! Screenshot saved: ${proofPath}`);

    // Update applied_todays
    const appliedPath = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      id: 'ashby_tavily_' + Date.now(),
      company: 'Tavily',
      role: 'Software Engineer',
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
