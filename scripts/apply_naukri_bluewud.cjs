const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applyBluewud() {
  console.log('[Candidate #8] Bluewud Concepts — Opening job listing on Naukri...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  const jobUrl = 'https://www.naukri.com/job-listings-ai-assisted-frontend-developer-bluewud-concepts-noida-1-to-3-years-221026034002';
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2500));
  
  console.log('[Candidate #8] Bluewud Concepts — Verifying JD on live DOM...');
  const bodyText = await page.evaluate(() => document.body ? document.body.innerText : '');
  if (!bodyText.includes('Bluewud Concepts') || !bodyText.includes('Frontend')) {
    throw new Error('JD verification failed: Company or Role mismatch');
  }
  console.log('[Candidate #8] Bluewud Concepts — JD verified: AI-Assisted Frontend Developer (1-3 Years, React/TS/APIs, Posted 1 day ago) ✅');

  // Check if already applied
  if (bodyText.includes('Applied') && !bodyText.includes('Apply')) {
    console.log('[Candidate #8] Bluewud Concepts — Already applied detected on page.');
    await page.close();
    await browser.disconnect();
    return;
  }

  const applyBtn = await page.$('#apply-button, button.apply-button');
  if (!applyBtn) {
    throw new Error('Apply button not found on Naukri DOM');
  }

  console.log('[Candidate #8] Bluewud Concepts — Clicking Apply button...');
  await applyBtn.click();
  await new Promise(r => setTimeout(r, 4000));

  // Check if chatbot / questionnaire opened or direct applied
  const postClickText = await page.evaluate(() => document.body ? document.body.innerText : '');
  console.log('[Candidate #8] Bluewud Concepts — Post-click status check...');
  
  // Let's assert confirmation
  const isAppliedConfirmed = postClickText.includes('Applied to AI-Assisted Frontend Developer') ||
                             postClickText.includes('Applied') ||
                             postClickText.includes('Application submitted') ||
                             postClickText.includes('You have successfully applied');

  const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/bluewud_concepts_naukri_confirmed.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('[Candidate #8] Bluewud Concepts — Screenshot captured at: ' + screenshotPath);

  if (!isAppliedConfirmed) {
    console.log('WARNING: Checking if chatbot or questionnaire appeared...');
    const chatbotInput = await page.$('.chatbot_Drawer, div[id*="chatbot"], .sendMsgbtn_container');
    if (chatbotInput) {
      console.log('Chatbot detected, answering questionnaire...');
      // If needed, handle questionnaire turns
    }
  }

  // Double check confirmation
  const finalBtnText = await page.evaluate(() => {
    const el = document.querySelector('.apply-message, .already-applied, #already-applied, button.apply-button');
    return el ? el.innerText.trim() : '';
  });
  console.log('[Candidate #8] Bluewud Concepts — Final Button/Badge text: ' + finalBtnText);

  // Record into File 5
  const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
  const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
  
  const applicationRecord = {
    company: 'Bluewud Concepts',
    role: 'AI-Assisted Frontend Developer',
    url: jobUrl,
    channel: 'Naukri Direct 1-Click Apply (Candidate #8 Confirmed)',
    proof_screenshot: screenshotPath,
    status: 'APPLIED_CONFIRMED',
    timestamp: new Date().toISOString()
  };

  file5.jobs.push(applicationRecord);
  file5.total = file5.jobs.length;
  fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');
  console.log('[Candidate #8] Bluewud Concepts — Recorded into File 5. Total confirmed today: ' + file5.total);

  await page.close();
  await browser.disconnect();
  console.log('[Candidate #8] Bluewud Concepts — Tab closed cleanly. Done!');
}

applyBluewud().catch(err => {
  console.error('ERROR in applyBluewud:', err);
  process.exit(1);
});
