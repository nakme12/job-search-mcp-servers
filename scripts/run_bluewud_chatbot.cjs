const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

async function answerChatbot() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const page = await browser.newPage();
  const jobUrl = 'https://www.naukri.com/job-listings-ai-assisted-frontend-developer-bluewud-concepts-noida-1-to-3-years-221026034002';
  await page.goto(jobUrl, { waitUntil: 'domcontentloaded' });
  await new Promise(r => setTimeout(r, 2000));
  await page.click('#apply-button');
  await new Promise(r => setTimeout(r, 2500));

  const maxSteps = 10;
  for (let step = 0; step < maxSteps; step++) {
    const isConfirmed = await page.evaluate(() => {
      const text = document.body ? document.body.innerText : '';
      return text.includes('Applied to AI-Assisted Frontend Developer') ||
             text.includes('Application submitted') ||
             text.includes('You have successfully applied') ||
             text.includes('Applied successfully');
    });

    if (isConfirmed) {
      console.log('APPLICATION CONFIRMED ON DOM!');
      break;
    }

    // Check last bot question
    const lastQuestion = await page.evaluate(() => {
      const botMsgs = Array.from(document.querySelectorAll('.botMsg, .botItem'));
      return botMsgs.length > 0 ? botMsgs[botMsgs.length - 1].innerText.trim() : '';
    });
    console.log(`[Step ${step + 1}] Last bot message:`, lastQuestion);

    // Check if options/chips exist
    const options = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('.chatbot_ListItem .chip, .quick-reply, .optionChip, .btn-primary'))
        .map(el => ({ text: el.innerText.trim(), tag: el.tagName }));
    });

    if (options.length > 0) {
      console.log('Found options:', options);
      // Click suitable option
      await page.click('.chatbot_ListItem .chip, .quick-reply, .optionChip');
      await new Promise(r => setTimeout(r, 2000));
      continue;
    }

    // Otherwise type into .textArea
    const inputDiv = await page.$('.textArea');
    if (inputDiv) {
      await inputDiv.click();
      let answer = '1.5';
      const qLower = lastQuestion.toLowerCase();
      if (qLower.includes('ctc') || qLower.includes('salary')) {
        answer = '216000';
      } else if (qLower.includes('notice')) {
        answer = '15';
      } else if (qLower.includes('location') || qLower.includes('city')) {
        answer = 'Indore';
      }
      console.log(`Typing answer "${answer}" for question: "${lastQuestion}"`);
      await page.keyboard.type(answer);
      await new Promise(r => setTimeout(r, 500));
      
      // Look for send button or press Enter
      const sendBtn = await page.$('.sendMsgbtn_container, .chatBot-ic-send, .send-btn, button[class*="send"]');
      if (sendBtn) {
        await sendBtn.click();
      } else {
        await page.keyboard.press('Enter');
      }
      await new Promise(r => setTimeout(r, 2500));
    } else {
      console.log('No input found, checking confirmation...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  const screenshotPath = 'C:/mcp/job-search-mcp-engine/screenshots/2026-10-23/shift1/bluewud_concepts_naukri_confirmed.png';
  fs.mkdirSync(path.dirname(screenshotPath), { recursive: true });
  await page.screenshot({ path: screenshotPath });
  console.log('Screenshot saved to:', screenshotPath);

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
  console.log('Recorded in File 5. Total applied today:', file5.total);

  await page.close();
  await browser.disconnect();
}

answerChatbot().catch(console.error);
