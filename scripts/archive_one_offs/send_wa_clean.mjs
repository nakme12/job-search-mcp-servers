import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  // 1. Close any open dialog by pressing Escape
  console.log('Pressing Escape to close any overlay/modal...');
  await wa.keyboard.press('Escape');
  await sleep(1000);
  await wa.keyboard.press('Escape');
  await sleep(1000);

  // 2. Click Aman Techstuff in the chat list
  console.log('Finding and clicking Aman Techstuff in chat list...');
  const clicked = await wa.evaluate(() => {
    const allSpans = Array.from(document.querySelectorAll('span'));
    const amanSpan = allSpans.find(s => s.innerText && s.innerText.trim() === 'Aman Techstuff');
    if (amanSpan) {
      amanSpan.click();
      return true;
    }
    return false;
  });
  console.log('Clicked Aman Techstuff:', clicked);
  await sleep(2500);

  // 3. Confirm #main is open
  const mainHeader = await wa.evaluate(() => {
    const main = document.querySelector('#main');
    return main ? main.querySelector('header')?.innerText?.replace(/\n+/g, ' ') : null;
  });
  console.log('Open chat in #main:', mainHeader);

  // 4. Send files
  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Trigger attach document menu
  const attachBtn = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"]');
  if (attachBtn) {
    await attachBtn.click();
    await sleep(1500);
  }

  // Find document input (accept="*")
  let docInput = await wa.$('input[type="file"][accept*="*"]');
  if (!docInput) docInput = await wa.$('input[type="file"]');

  console.log('Uploading FE Resume...');
  await docInput.uploadFile(feResume);
  await sleep(4000);

  let sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) await sendBtn.click();
  else await wa.keyboard.press('Enter');

  console.log('FE Resume sent. Waiting 5s...');
  await sleep(5000);

  // Send MERN Resume
  const attachBtn2 = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"]');
  if (attachBtn2) {
    await attachBtn2.click();
    await sleep(1500);
  }

  let docInput2 = await wa.$('input[type="file"][accept*="*"]');
  if (!docInput2) docInput2 = await wa.$('input[type="file"]');

  console.log('Uploading MERN Resume...');
  await docInput2.uploadFile(mernResume);
  await sleep(4000);

  sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) await sendBtn.click();
  else await wa.keyboard.press('Enter');

  console.log('MERN Resume sent. Waiting 5s...');
  await sleep(5000);

  // Verify
  const verification = await wa.evaluate(() => {
    const mainText = document.querySelector('#main')?.innerText || '';
    return {
      hasFE: mainText.includes('Frontend Engineer.pdf') || mainText.includes('Frontend Engineer'),
      hasMERN: mainText.includes('MERN Full Stack.pdf') || mainText.includes('MERN Full Stack')
    };
  });
  console.log('Verification in live chat:', verification);

  await browser.disconnect();
}

main().catch(console.error);
