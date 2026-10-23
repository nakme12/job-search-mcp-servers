const puppeteer = require('puppeteer-core');

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const p = pages.find(page => page.url().includes('jobs.ashbyhq.com/dust'));
  if (!p) {
    console.log('Dust page not found!');
    browser.disconnect();
    return;
  }

  // Focus and type directly via puppeteer CDP
  const compInput = await p.$('input[type="number"]');
  if (compInput) {
    console.log('Found compInput, focusing and typing...');
    await compInput.click();
    await p.keyboard.type('50000');
  }

  const ta = await p.$('textarea');
  if (ta) {
    console.log('Found textarea, focusing and typing...');
    await ta.click();
    await p.keyboard.type('I am inspired by Dust mission to build intuitive human-agent collaboration interfaces. With 1.5 years of experience in React, TypeScript, and modern frontend architecture, I want to deliver scalable and reactive UI systems for your AI platform.');
  }

  await new Promise(r => setTimeout(r, 1500));

  // Check submit button
  console.log('Clicking Submit Application...');
  const submitBtn = await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText.trim()));
    if (btn) {
      btn.scrollIntoView({ behavior: 'instant', block: 'center' });
      btn.click();
      return true;
    }
    return false;
  });
  console.log('Submit clicked:', submitBtn);

  // Wait for confirmation
  let isConfirmed = false;
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 2500));
    isConfirmed = await p.evaluate(() => {
      const text = document.body ? document.body.innerText.toLowerCase() : '';
      return text.includes('thank you') || 
             text.includes('application submitted') || 
             text.includes('received your application') || 
             text.includes('submitted successfully');
    });
    if (isConfirmed) break;
  }

  console.log('Confirmed:', isConfirmed);

  if (isConfirmed) {
    const ssPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\ashby_dust_applied.png';
    await p.screenshot({ path: ssPath, fullPage: true });
    console.log('Saved screenshot:', ssPath);

    const fs = require('fs');
    const appFile = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const appData = JSON.parse(fs.readFileSync(appFile, 'utf8'));
    appData.jobs.push({
      id: 'ashby_dust_' + Date.now(),
      company: 'Dust',
      role: 'Software Engineer',
      url: p.url(),
      channel: 'Direct ATS Portal Form (Ashby)',
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
      screenshot: ssPath,
      status: 'CONFIRMED_APPLIED',
      timestamp: new Date().toISOString()
    });
    appData.total = appData.jobs.length;
    fs.writeFileSync(appFile, JSON.stringify(appData, null, 2));
    console.log('Recorded in File 5! Total applied:', appData.total);

    await p.close();
    console.log('Tab closed per Rule 57.');
  } else {
    await p.screenshot({ path: 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\dust_after_keyboard_submit.png' });
    console.log('Still not confirmed, kept tab open.');
  }

  browser.disconnect();
})();
