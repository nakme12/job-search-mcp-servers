const puppeteer = require('puppeteer-core');
const fs = require('fs');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  let p = pages.find(page => page.url().includes('jobs.ashbyhq.com/supabase'));
  if (!p) {
    console.log('No Supabase tab found.');
    return;
  }
  const url = 'https://jobs.ashbyhq.com/supabase/e569b7f7-fa8f-4139-86f6-4f52b456882d/application';

  console.log('1. Clicking web framework option label...');
  const clicked = await p.evaluate(() => {
    const lbl = document.querySelector('label[for*="8dca36d0-2b14-40ac-9b06-ebf32e5e55e5-labeled-radio-1"]');
    if (lbl) {
      lbl.scrollIntoView({ behavior: 'instant', block: 'center' });
      lbl.click();
      return true;
    }
    return false;
  });
  console.log('Clicked web framework label?', clicked);
  await new Promise(r => setTimeout(r, 1500));

  console.log('2. Clicking Submit Application button...');
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

  console.log('3. Waiting 8s for confirmation...');
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
    const proofPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\ashby_supabase_applied.png';
    await p.screenshot({ path: proofPath, fullPage: true });
    console.log(`✅ CONFIRMED APPLIED! Screenshot saved: ${proofPath}`);

    // Update applied_todays
    const appliedPath = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const appliedData = JSON.parse(fs.readFileSync(appliedPath, 'utf8'));
    appliedData.jobs.push({
      id: 'ashby_supabase_' + Date.now(),
      company: 'Supabase',
      role: 'Software Engineer - Auth',
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
    console.log('⚠️ Not yet confirmed. Keeping tab open.');
  }
})();
