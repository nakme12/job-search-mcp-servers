const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const p = pages.find(page => page.url().includes('jobs.ashbyhq.com/dust'));
  if (!p) {
    console.log('Dust page not found!');
    browser.disconnect();
    return;
  }

  console.log('[Job 1/1] Dust — Found open application tab:', await p.title());

  // Set number field: Compensation Expectations
  console.log('[Job 1/1] Dust — Setting Compensation Expectations (50000 EUR)...');
  await p.evaluate(() => {
    const input = document.querySelector('input#dbae9486-b1c9-4dae-a763-6c82012469e8') || document.querySelector('input[type="number"]');
    if (input) {
      input.focus();
      input.value = '';
      input.value = '50000';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
      input.blur();
    }
  });

  // Set textarea: Why do you want to join Dust?
  console.log('[Job 1/1] Dust — Setting Why do you want to join Dust...');
  await p.evaluate(() => {
    const ta = document.getElementById('01483165-3986-482b-9a5a-631d8530151c') || document.querySelector('textarea');
    if (ta) {
      ta.focus();
      ta.value = '';
      ta.value = 'I am inspired by Dust\'s mission to build intuitive human-agent collaboration interfaces. With 1.5 years of experience in React, TypeScript, and modern frontend architecture, I want to deliver scalable and reactive UI systems for your AI platform.';
      ta.dispatchEvent(new Event('input', { bubbles: true }));
      ta.dispatchEvent(new Event('change', { bubbles: true }));
      ta.blur();
    }
  });

  // Select Option Buttons:
  // 1. Do you have the appropriate work authorization for this role? -> No (Candidate in India requires work visa/sponsorship for Paris)
  // 2. Are you happy 4 days office based? -> Yes
  console.log('[Job 1/1] Dust — Setting Work Auth (No - needs visa) and Office Based (Yes)...');
  await p.evaluate(() => {
    const groups = Array.from(document.querySelectorAll('fieldset, [role="radiogroup"], div'));
    for (const g of groups) {
      const gText = (g.innerText || '').toLowerCase();
      if (gText.includes('appropriate work authorization') && gText.includes('yes') && gText.includes('no')) {
        const noBtn = Array.from(g.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'no');
        if (noBtn) noBtn.click();
      }
      if (gText.includes('happy 4 days office based') && gText.includes('yes') && gText.includes('no')) {
        const yesBtn = Array.from(g.querySelectorAll('button')).find(b => b.innerText.trim().toLowerCase() === 'yes');
        if (yesBtn) yesBtn.click();
      }
    }
  });

  await sleep(2000);

  // Submit Click
  console.log('[Job 1/1] Dust — Submit click kiya...');
  await p.evaluate(() => {
    const btn = Array.from(document.querySelectorAll('button')).find(b => /submit application/i.test(b.innerText.trim()));
    if (btn) {
      btn.scrollIntoView({ behavior: 'instant', block: 'center' });
      btn.click();
    }
  });

  // Wait for confirmation
  console.log('[Job 1/1] Dust — Waiting for confirmation on DOM...');
  let isConfirmed = false;
  for (let i = 0; i < 6; i++) {
    await sleep(2500);
    isConfirmed = await p.evaluate(() => {
      const text = document.body ? document.body.innerText.toLowerCase() : '';
      return text.includes('thank you') || 
             text.includes('application submitted') || 
             text.includes('received your application') || 
             text.includes('submitted successfully') ||
             text.includes('application has been received');
    });
    if (isConfirmed) break;
  }

  console.log('[Job 1/1] Dust — Confirmation result:', isConfirmed);

  if (isConfirmed) {
    const proofPath = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\ashby_dust_applied.png';
    await p.screenshot({ path: proofPath, fullPage: true });
    console.log(`[Job 1/1] Dust — Confirmation detected ✅ Screenshot saved: ${path.basename(proofPath)}`);

    const appFile = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
    const appData = JSON.parse(fs.readFileSync(appFile, 'utf8'));
    appData.jobs.push({
      id: 'ashby_dust_' + Date.now(),
      company: 'Dust',
      role: 'Software Engineer',
      url: p.url(),
      channel: 'Direct ATS Portal Form (Ashby)',
      resume: 'Pratik Patidar Resume - MERN Full Stack.pdf',
      screenshot: proofPath,
      status: 'CONFIRMED_APPLIED',
      timestamp: new Date().toISOString()
    });
    appData.total = appData.jobs.length;
    fs.writeFileSync(appFile, JSON.stringify(appData, null, 2));
    console.log(`[Job 1/1] Dust — Recorded in applied_todays_2026-10-19.json. Total applied today: ${appData.total}`);

    await p.close();
    console.log('[Job 1/1] Dust — Tab closed per Rule 57.');
  } else {
    console.log('[Job 1/1] Dust — Submission pending or error present. Keeping tab open.');
    await p.screenshot({ path: 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1\\dust_after_submit_attempt.png' });
  }

  browser.disconnect();
})();
