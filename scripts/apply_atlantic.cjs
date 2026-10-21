const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const APPLIED_FILE = 'C:\\mcp\\job-search-mcp-engine\\applied_todays_2026-10-19.json';
const SCREENSHOT_DIR = 'C:\\mcp\\job-search-mcp-engine\\screenshots\\2026-10-19\\shift1';

(async () => {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const p = await browser.newPage();
  const url = 'https://www.naukri.com/job-listings-web-developer-atlantic-publishers-distributors-noida-delhi-ncr-0-to-5-years-161026016360';

  try {
    console.log('[Atlantic Publishers] Opening URL...');
    await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await new Promise(r => setTimeout(r, 4000));

    // click apply
    await p.evaluate(() => {
      const b = Array.from(document.querySelectorAll('button, a')).find(x => (x.innerText||'').trim().toLowerCase() === 'apply');
      if (b) b.click();
    });

    await new Promise(r => setTimeout(r, 3000));

    // Type experience using keyboard into .textArea div
    const textAreaEl = await p.$('.chatbot_InputContainer .textArea, [id^="userInput__"]');
    if (textAreaEl) {
      console.log('Found .textArea div! Focusing and typing 1...');
      await textAreaEl.click();
      await new Promise(r => setTimeout(r, 500));
      await p.keyboard.type('1', { delay: 100 });
      console.log('Typed 1 into chatbot .textArea!');
    }

    await new Promise(r => setTimeout(r, 1500));

    // Click Save / sendMsg button
    console.log('Clicking Save / sendMsg button...');
    await p.evaluate(() => {
      const sendBtn = document.querySelector('[id^="sendMsg__"]') || 
                      document.querySelector('.sendMsgbtn_container') || 
                      document.querySelector('.sendMsg');
      if (sendBtn) {
        sendBtn.click();
      } else {
        const btns = Array.from(document.querySelectorAll('button, div'));
        const b = btns.find(x => (x.innerText||'').trim().toLowerCase() === 'save');
        if (b) b.click();
      }
    });

    await new Promise(r => setTimeout(r, 4000));

    // Save screenshot after submit to see state
    const ssPath = path.join(SCREENSHOT_DIR, 'atlantic_chatbot_state.png');
    await p.screenshot({ path: ssPath, fullPage: true });
    console.log('Chatbot state screenshot saved to:', ssPath);

    const chatText = await p.evaluate(() => {
      const msgs = Array.from(document.querySelectorAll('.msg, .chatItem, .botMsg, .chatbot_Drawer'));
      return msgs.map(m => m.innerText.trim()).filter(Boolean);
    });
    console.log('Chat text:', chatText);

    // Assert confirmation
    const isSuccess = await p.evaluate(() => {
      const t = document.body ? document.body.innerText : '';
      return /applied successfully|application sent|you have successfully applied|applied on|already applied/i.test(t);
    });

    console.log('Atlantic confirmation:', isSuccess);
    if (isSuccess) {
      const proofPath = path.join(SCREENSHOT_DIR, 'naukri_atlantic_publishers_applied.png');
      await p.screenshot({ path: proofPath, fullPage: true });
      console.log('Proof saved:', proofPath);

      const data = JSON.parse(fs.readFileSync(APPLIED_FILE, 'utf8'));
      data.jobs.push({
        id: 'naukri_atlantic_' + Date.now(),
        company: 'Atlantic Publishers & Distributors',
        role: 'Web Developer',
        url: url,
        application_type: 'Direct Naukri 1-Click Apply',
        status: 'CONFIRMED_APPLIED',
        submitted_at: new Date().toISOString(),
        screenshot_proof: proofPath
      });
      data.total = data.jobs.length;
      fs.writeFileSync(APPLIED_FILE, JSON.stringify(data, null, 2));
      console.log('Updated File 5! Confirmed total applied today:', data.total);
    }
  } finally {
    await p.close();
  }
})();
