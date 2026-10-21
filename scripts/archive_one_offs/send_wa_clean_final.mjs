import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  // 1. Close "Select chats" modal by clicking the X button
  console.log('Closing "Select chats" modal...');
  const closeBtn = await wa.$('div[role="dialog"] span[data-icon="x"], div[role="dialog"] button');
  if (closeBtn) {
    await closeBtn.click();
    await sleep(1000);
  } else {
    await wa.keyboard.press('Escape');
    await sleep(1000);
  }

  // 2. Click Aman Techstuff in the left chats list
  console.log('Clicking Aman Techstuff chat in left sidebar...');
  const clicked = await wa.evaluate(() => {
    const list = document.querySelectorAll('#pane-side div[role="listitem"]');
    for (const item of list) {
      if (item.innerText.includes('Aman Techstuff')) {
        item.click();
        return true;
      }
    }
    const spans = document.querySelectorAll('#pane-side span[title="Aman Techstuff"]');
    if (spans.length > 0) {
      spans[0].click();
      return true;
    }
    return false;
  });
  console.log('Clicked Aman Techstuff:', clicked);
  await sleep(3000);

  // Take screenshot to verify chat opened
  await wa.screenshot({ path: 'scripts/wa_chat_opened.png' });

  // 3. Upload FE Resume
  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  console.log('Attaching FE Resume...');
  const attachBtn = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"]');
  if (attachBtn) {
    await attachBtn.click();
    await sleep(1500);
  }

  // Find document input
  const fileInputs = await wa.$$('input[type="file"]');
  console.log(`Found ${fileInputs.length} file inputs`);
  // Document input is usually accept="*"
  let docInput = null;
  for (const fi of fileInputs) {
    const acc = await fi.evaluate(el => el.accept);
    if (acc === '*' || acc.includes('*')) {
      docInput = fi;
      break;
    }
  }
  if (!docInput && fileInputs.length > 0) docInput = fileInputs[0];

  if (!docInput) {
    console.error('No file input found');
    await browser.disconnect();
    return;
  }

  await docInput.uploadFile(feResume);
  console.log('FE Resume uploaded to preview. Waiting 4s...');
  await sleep(4000);

  // Click green send button
  const sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) await sendBtn.click();
  else await wa.keyboard.press('Enter');

  console.log('FE Resume send clicked! Waiting 5s...');
  await sleep(5000);

  // 4. Upload MERN Resume
  console.log('Attaching MERN Resume...');
  const attachBtn2 = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"]');
  if (attachBtn2) {
    await attachBtn2.click();
    await sleep(1500);
  }

  const fileInputs2 = await wa.$$('input[type="file"]');
  let docInput2 = null;
  for (const fi of fileInputs2) {
    const acc = await fi.evaluate(el => el.accept);
    if (acc === '*' || acc.includes('*')) {
      docInput2 = fi;
      break;
    }
  }
  if (!docInput2 && fileInputs2.length > 0) docInput2 = fileInputs2[0];

  await docInput2.uploadFile(mernResume);
  console.log('MERN Resume uploaded to preview. Waiting 4s...');
  await sleep(4000);

  const sendBtn2 = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn2) await sendBtn2.click();
  else await wa.keyboard.press('Enter');

  console.log('MERN Resume send clicked! Waiting 5s...');
  await sleep(5000);

  await wa.screenshot({ path: 'scripts/wa_chat_final.png' });
  console.log('Done! Final screenshot saved.');

  await browser.disconnect();
}

main().catch(console.error);
