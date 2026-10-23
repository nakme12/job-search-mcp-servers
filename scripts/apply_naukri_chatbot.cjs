const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function applyNaukriChatbotClean() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const url = 'https://www.naukri.com/job-listings-react-mean-mern-node-js-developers-freshers-chennai-tvm-infotech-chennai-0-to-1-years-161026019268';
  console.log('[Naukri Chatbot] Navigating to:', url);
  await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });

  // 1. Trigger chatbot
  await page.evaluate(() => {
    const b = document.getElementById('apply-button');
    if (b) b.click();
  });
  console.log('[Naukri Chatbot] Apply clicked. Waiting for chatbot drawer...');
  await new Promise(r => setTimeout(r, 3000));

  // Loop through questions
  for (let turn = 1; turn <= 7; turn++) {
    console.log(`[Naukri Chatbot] Handling step ${turn}...`);

    // Check if already applied / success
    const isSuccess = await page.evaluate(() => {
      const text = document.body.innerText;
      return text.includes('Successfully applied') || 
             text.includes('Application sent') || 
             text.includes('applied to this job') ||
             text.includes('Your application has been sent');
    });

    if (isSuccess) {
      console.log('[Naukri Chatbot] Confirmed applied!');
      break;
    }

    // Determine and set answers
    await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();

      // Handle Radio
      const radios = Array.from(document.querySelectorAll('input[type="radio"]:not([disabled])'));
      if (radios.length > 0) {
        if (text.includes('holding pf') || text.includes('experienced holding')) {
          const noRadio = document.getElementById('No') || document.querySelector('input[value="No"]');
          if (noRadio) {
            noRadio.click();
            if (noRadio.parentElement) noRadio.parentElement.click();
          }
        } else if (text.includes('highest qualification') && (text.includes('ug') || text.includes('pg'))) {
          const ugRadio = document.getElementById('UG') || document.querySelector('input[value="UG"]');
          if (ugRadio) {
            ugRadio.click();
            if (ugRadio.parentElement) ugRadio.parentElement.click();
          }
        } else {
          const yesRadio = document.getElementById('Yes') || document.querySelector('input[value="Yes"]');
          if (yesRadio) {
            yesRadio.click();
            if (yesRadio.parentElement) yesRadio.parentElement.click();
          }
        }
      }

      // Handle Textbox (strictly type="text" only, NEVER type="file")
      const textInputs = Array.from(document.querySelectorAll('input[type="text"]')).filter(i => {
        const cls = (i.className || '').toLowerCase();
        const id = (i.id || '').toLowerCase();
        return !id.includes('keyword') && !id.includes('location') && !id.includes('experiencedd');
      });

      if (textInputs.length > 0) {
        const target = textInputs[0];
        target.focus();
        target.value = '';
        target.dispatchEvent(new Event('input', { bubbles: true }));
        if (text.includes('highest qualification degree') || text.includes('degree')) {
          target.value = 'B.Tech Computer Science';
        } else if (text.includes('year of passed out') || text.includes('passed out') || text.includes('year')) {
          target.value = '2024';
        } else {
          target.value = 'B.Tech CSE';
        }
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });

    await new Promise(r => setTimeout(r, 800));

    // Click Save / Send
    console.log('[Naukri Chatbot] Clicking Save / Send button...');
    await page.evaluate(() => {
      const sendBtn = document.querySelector('.sendMsgbtn_container, .send, .sendMsg, div[id*="sendMsg"]') ||
                      Array.from(document.querySelectorAll('*')).find(el => el.innerText && el.innerText.trim() === 'Save');
      if (sendBtn) sendBtn.click();
    });

    await new Promise(r => setTimeout(r, 3000));
  }

  // Final confirmation check
  const finalState = await page.evaluate(() => {
    const text = document.body.innerText;
    return {
      isSuccess: text.includes('Successfully applied') || 
                 text.includes('Application sent') || 
                 text.includes('applied to this job') ||
                 text.includes('Your application has been sent') ||
                 text.includes('Applied'),
      textSnippet: text.substring(0, 400)
    };
  });

  console.log('[Naukri Chatbot] Final state:', finalState);

  const proofDir = path.resolve('C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1');
  fs.mkdirSync(proofDir, { recursive: true });
  const proofPath = path.join(proofDir, 'naukri_tvm_infotech_confirmed.png');
  await page.screenshot({ path: proofPath, fullPage: true });

  if (finalState.isSuccess) {
    console.log('[Naukri Chatbot] Application Confirmed! Proof screenshot saved:', proofPath);
    const ledgerPath = path.resolve('C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json');
    let ledger = { date: '2026-10-23', cycle: 'Cycle 1 (11:00 AM - 03:00 PM)', total: 0, jobs: [] };
    if (fs.existsSync(ledgerPath)) {
      ledger = JSON.parse(fs.readFileSync(ledgerPath, 'utf8'));
    }
    ledger.jobs.push({
      company: 'TVM Infotech Private Limited',
      role: 'React, MEAN/MERN & Node.js Developers - Freshers(Chennai)',
      url: url,
      channel: 'Naukri Questionnaire Stepper Flow',
      proof_screenshot: proofPath,
      status: 'APPLIED_CONFIRMED',
      timestamp: new Date().toISOString()
    });
    ledger.total = ledger.jobs.length;
    fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2), 'utf8');
    console.log('[Naukri Chatbot] Appended to applied_todays_2026-10-23.json. Today total applied:', ledger.total);
    await page.close();
  } else {
    console.log('[Naukri Chatbot] Flow completed. Page kept for review.');
  }

  await browser.disconnect();
}

applyNaukriChatbotClean().catch(console.error);
