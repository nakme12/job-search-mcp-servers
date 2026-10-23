const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applySenwellNaukri() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://www.naukri.com/job-listings-mern-stack-developer-senwell-solutions-pune-0-to-2-years-220926048467';
  console.log('[Senwell Solutions Naukri] Opening:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

  // 1. Click Apply button
  console.log('[Senwell Solutions Naukri] Clicking Apply button...');
  const clicked = await page.evaluate(() => {
    const btn = document.getElementById('apply-button') || Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Apply');
    if (btn) {
      btn.click();
      return true;
    }
    return false;
  });
  console.log('[Senwell Solutions Naukri] Apply clicked:', clicked);

  await new Promise(r => setTimeout(r, 4000));

  // 2. Check for chatbot or questionnaire or direct 1-click success
  const postState = await page.evaluate(() => {
    const text = document.body.innerText;
    const isSuccess = text.includes('Successfully applied') || 
                      text.includes('Application sent') || 
                      text.includes('applied to this job') ||
                      text.includes('Your application has been sent') ||
                      document.body.innerText.includes('Already Applied') ||
                      document.body.innerText.includes('Applied');
    const hasChatbot = document.querySelector('.chatbot_drawer, .bot-container') !== null;
    return { isSuccess, hasChatbot, textSnippet: text.substring(0, 300) };
  });

  console.log('[Senwell Solutions Naukri] Post-click state:', postState);

  // If chatbot opened, answer it
  if (postState.hasChatbot && !postState.isSuccess) {
    console.log('[Senwell Solutions Naukri] Chatbot drawer detected. Answering questions...');
    for (let t = 1; t <= 5; t++) {
      await page.evaluate(() => {
        // Radio handling: default Yes / 15 Days
        const radios = Array.from(document.querySelectorAll('input[type="radio"]:not([disabled])'));
        if (radios.length > 0) {
          const yesRadio = document.getElementById('Yes') || document.querySelector('input[value="Yes"]') || radios[0];
          if (yesRadio) {
            yesRadio.click();
            if (yesRadio.parentElement) yesRadio.parentElement.click();
          }
        }
        // Textbox
        const txt = document.querySelector('div[class*="chatbot" i] input[type="text"], .chatbot_drawer input[type="text"], .bot-container input[type="text"]');
        if (txt) {
          txt.value = '1.5 Years';
          txt.dispatchEvent(new Event('input', { bubbles: true }));
          txt.dispatchEvent(new Event('change', { bubbles: true }));
        }
        // Click Save
        const sendBtn = document.querySelector('.sendMsgbtn_container, .send, .sendMsg, div[id*="sendMsg"]') ||
                        Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.trim() === 'Save');
        if (sendBtn) sendBtn.click();
      });
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  // 3. Final confirmation check
  const finalState = await page.evaluate(() => {
    const text = document.body.innerText;
    return text.includes('Successfully applied') || 
           text.includes('Application sent') || 
           text.includes('applied to this job') ||
           text.includes('Your application has been sent') ||
           text.includes('Applied');
  });

  const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
  fs.mkdirSync(proofDir, { recursive: true });
  const proofPath = path.join(proofDir, 'senwell_solutions_naukri_confirmed.png');
  await page.screenshot({ path: proofPath, fullPage: true });

  if (finalState) {
    console.log('[Senwell Solutions Naukri] Application Confirmed! Saved screenshot:', proofPath);
    const ledgerPath = path.resolve('C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json');
    let ledger = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
    if (fs.existsSync(ledgerPath)) {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    }
    ledger.jobs.push({
      company: 'Senwell Solutions',
      role: 'Mern Stack Developer (0-2 YOE)',
      url: url,
      channel: 'Naukri Direct 1-Click Apply (Candidate #5 Confirmed)',
      proof_screenshot: proofPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    ledger.total = ledger.jobs.length;
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
    console.log('[Senwell Solutions Naukri] Recorded in File 5! Total applied today:', ledger.total);
    await page.close();
  } else {
    console.log('[Senwell Solutions Naukri] State after attempt. Review proof:', proofPath);
  }

  await browser.disconnect();
}

applySenwellNaukri().catch(console.error);
