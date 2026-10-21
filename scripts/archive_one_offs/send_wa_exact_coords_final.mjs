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

  // In screenshot, Aman Techstuff is visible in left pane around x=180, y=630
  console.log('Clicking directly on Aman Techstuff row by coordinates x=180, y=630...');
  await wa.mouse.click(180, 630);
  await sleep(3000);

  // Take screenshot to verify Aman chat is open
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_chat_open_proof.png' });

  const activeTitle = await wa.evaluate(() => {
    return document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' ');
  });
  console.log('Opened header in #main:', activeTitle);

  // Paperclip button in Aman's footer is at x=366, y=948
  console.log('Clicking paperclip attach button...');
  await wa.mouse.click(366, 948);
  await sleep(1500);

  // Document option is at x=360, y=538
  console.log('Clicking Document option in popup menu...');
  await wa.mouse.click(360, 538);
  await sleep(2000);

  // Upload FE Resume
  const inputs = await wa.$$('input[type="file"]');
  const fileInput = inputs[inputs.length - 1];
  if (fileInput) {
    console.log('Uploading FE Resume...');
    await fileInput.uploadFile(feResume);
    await sleep(4000);

    // Click green circular send button at x=1466, y=670
    console.log('Clicking green send button for FE...');
    await wa.mouse.click(1466, 670);
    await sleep(5000);
  }

  // Send MERN Resume
  console.log('Clicking paperclip attach button for MERN...');
  await wa.mouse.click(366, 948);
  await sleep(1500);

  console.log('Clicking Document option for MERN...');
  await wa.mouse.click(360, 538);
  await sleep(2000);

  const inputs2 = await wa.$$('input[type="file"]');
  const fileInput2 = inputs2[inputs2.length - 1];
  if (fileInput2) {
    console.log('Uploading MERN Resume...');
    await fileInput2.uploadFile(mernResume);
    await sleep(4000);

    console.log('Clicking green send button for MERN...');
    await wa.mouse.click(1466, 670);
    await sleep(5000);
  }

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_delivered_final_proof.png' });
  console.log('Saved final proof to screenshots/2026-10-12/wa_aman_delivered_final_proof.png');

  await browser.disconnect();
}

main().catch(console.error);
