import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  console.log('Sending FE Resume to Aman Techstuff...');
  // Click plus attach button
  const plusBtn = await wa.$('span[data-icon="plus"]');
  if (plusBtn) {
    await plusBtn.click();
    await sleep(1200);
  }

  // Find document file input specifically
  const fileInputs = await wa.$$('input[type="file"]');
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
    console.error('File input not found');
    await browser.disconnect();
    return;
  }

  await docInput.uploadFile(feResume);
  console.log('FE resume uploaded. Waiting 3s for preview...');
  await sleep(3500);

  // Take screenshot of preview modal to see send button
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_preview_fe.png' });

  // In WhatsApp preview, the send button has data-icon="send" or aria-label="Send"
  let sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"], button[aria-label="Send"]');
  if (sendBtn) {
    await sendBtn.click();
    console.log('Clicked sendBtn for FE');
  } else {
    console.log('Pressing Enter for FE');
    await wa.keyboard.press('Enter');
  }
  await sleep(4000);

  // Send MERN Resume
  console.log('Sending MERN Resume...');
  const plusBtn2 = await wa.$('span[data-icon="plus"]');
  if (plusBtn2) {
    await plusBtn2.click();
    await sleep(1200);
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
  console.log('MERN resume uploaded. Waiting 3s for preview...');
  await sleep(3500);

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_preview_mern.png' });

  let sendBtn2 = await wa.$('span[data-icon="send"], div[aria-label="Send"], button[aria-label="Send"]');
  if (sendBtn2) {
    await sendBtn2.click();
    console.log('Clicked sendBtn for MERN');
  } else {
    console.log('Pressing Enter for MERN');
    await wa.keyboard.press('Enter');
  }
  await sleep(4000);

  // Take final screenshot of chat to confirm delivery
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_chat_confirmed.png' });
  console.log('Final screenshot saved to screenshots/2026-10-12/wa_chat_confirmed.png');

  await browser.disconnect();
}

main().catch(console.error);
