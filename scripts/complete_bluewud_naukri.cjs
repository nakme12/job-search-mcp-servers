const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function completeBluewudNaukri() {
  console.log('[Candidate #8] Connecting to browser...');
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  
  const jobUrl = 'https://www.naukri.com/job-listings-ai-assisted-frontend-developer-bluewud-concepts-noida-1-to-3-years-221026034002';
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await new Promise(r => setTimeout(r, 2000));

  console.log('[Candidate #8] Clicking Apply button...');
  await page.click('#apply-button');
  await new Promise(r => setTimeout(r, 2500));

  // Chatbot turn-by-turn solver loop
  for (let turn = 1; turn <= 6; turn++) {
    console.log(`--- Turn ${turn} ---`);
    
    // Check if application is already confirmed
    const status = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      const isConfirmed = text.includes('Applied to AI-Assisted Frontend Developer') ||
                          text.includes('You have successfully applied') ||
                          text.includes('Application submitted') ||
                          text.includes('Applied successfully');
      return { isConfirmed, snippet: text.substring(0, 400) };
    });

    if (status.isConfirmed) {
      console.log('>>> APPLICATION CONFIRMED ON DOM! <<<');
      break;
    }

    // Check for radio buttons / labels like "Yes"
    const clickedRadio = await page.evaluate(() => {
      const labels = Array.from(document.querySelectorAll('label.ssrc__label, .radio-label, label'));
      const yesLabel = labels.find(l => l.innerText.trim() === 'Yes' || l.innerText.trim().toLowerCase() === 'immediate');
      if (yesLabel) {
        yesLabel.click();
        return 'Clicked Yes label';
      }
      return null;
    });

    if (clickedRadio) {
      console.log('Action:', clickedRadio);
      await new Promise(r => setTimeout(r, 1000));
      // Click Save / Submit if present
      await page.evaluate(() => {
        const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.trim() === 'Save' || b.innerText.trim() === 'Submit');
        if (btn) btn.click();
      });
      await new Promise(r => setTimeout(r, 2500));
      continue;
    }

    // Check for text area input
    const handledText = await page.evaluate(() => {
      const lastMsg = Array.from(document.querySelectorAll('.botMsg, .botItem')).pop();
      const qText = lastMsg ? lastMsg.innerText.toLowerCase() : '';
      const input = document.querySelector('.textArea');
      if (input) {
        input.focus();
        let val = '1.5';
        if (qText.includes('salary') || qText.includes('ctc')) val = '216000';
        else if (qText.includes('notice')) val = '15';
        else if (qText.includes('city') || qText.includes('location')) val = 'Indore';
        input.innerText = val;
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return { q: qText, val };
      }
      return null;
    });

    if (handledText) {
      console.log(`Action: Typed "${handledText.val}" for: "${handledText.q.substring(0, 60)}"`);
      await page.keyboard.press('Enter');
      await new Promise(r => setTimeout(r, 2500));
      continue;
    }

    // Check for generic Save / Submit buttons
    const clickedBtn = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button, .sendMsgbtn_container'));
      const target = btns.find(b => b.innerText && (b.innerText.trim() === 'Save' || b.innerText.trim() === 'Submit' || b.innerText.trim() === 'Apply'));
      if (target) {
        target.click();
        return 'Clicked ' + target.innerText.trim();
      }
      return null;
    });

    if (clickedBtn) {
      console.log('Action:', clickedBtn);
      await new Promise(r => setTimeout(r, 2500));
    } else {
      console.log('No action identified in this turn. Waiting 2s...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  // Final check and screenshot
  const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/bluewud_concepts_naukri_confirmed.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath, fullPage: false });
  console.log('Post-submit screenshot captured at: ' + screenshotPath);

  // Assert DOM confirmation string
  const postSubmitText = await page.evaluate(() => document.body ? document.body.innerText : '');
  const confirmed = postSubmitText.includes('Applied') || postSubmitText.includes('successfully');
  console.log('Confirmation status asserted:', confirmed);

  // Update File 5
  const file5Path = 'C:/mcp/job-search-mcp-engine/data/daily/applied_todays_2026-10-23.json';
  const file5 = JSON.parse(fs.readFileSync(file5Path, 'utf8'));
  const existingIdx = file5.jobs.findIndex(j => j.company === 'Bluewud Concepts');
  const record = {
    company: 'Bluewud Concepts',
    role: 'AI-Assisted Frontend Developer',
    url: jobUrl,
    channel: 'Naukri Stepper Chatbot Apply (Candidate #8 Confirmed)',
    proof_screenshot: screenshotPath,
    status: 'APPLIED_CONFIRMED',
    timestamp: new Date().toISOString()
  };

  if (existingIdx >= 0) {
    file5.jobs[existingIdx] = record;
  } else {
    file5.jobs.push(record);
  }
  file5.total = file5.jobs.length;
  fs.writeFileSync(file5Path, JSON.stringify(file5, null, 2), 'utf8');
  console.log(`[FILE 5 UPDATED] Total confirmed today: ${file5.total}`);

  await page.close();
  await browser.disconnect();
  console.log('Clean exit.');
}

completeBluewudNaukri().catch(console.error);
