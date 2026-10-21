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

  // Change input[type="file"] accept to *
  console.log('Patching file input accept attribute to allow all document types...');
  await wa.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach(i => {
      i.removeAttribute('accept');
      i.setAttribute('accept', '*');
      i.multiple = true;
    });
  });

  const fileInput = await wa.$('input[type="file"]');
  if (!fileInput) {
    console.error('No file input found');
    await browser.disconnect();
    return;
  }

  console.log('Uploading FE Resume to patched input...');
  await fileInput.uploadFile(feResume);
  await sleep(4000);

  // Take screenshot of preview
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_patched_preview.png' });

  // Look for green send button in preview
  const sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"], button[aria-label="Send"]');
  if (sendBtn) {
    await sendBtn.click();
    console.log('Send button clicked for FE!');
  } else {
    await wa.keyboard.press('Enter');
    console.log('Enter pressed for FE');
  }
  await sleep(5000);

  // Upload MERN Resume
  await wa.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach(i => {
      i.removeAttribute('accept');
      i.setAttribute('accept', '*');
    });
  });

  const fileInput2 = await wa.$('input[type="file"]');
  console.log('Uploading MERN Resume...');
  await fileInput2.uploadFile(mernResume);
  await sleep(4000);

  const sendBtn2 = await wa.$('span[data-icon="send"], div[aria-label="Send"], button[aria-label="Send"]');
  if (sendBtn2) {
    await sendBtn2.click();
    console.log('Send button clicked for MERN!');
  } else {
    await wa.keyboard.press('Enter');
    console.log('Enter pressed for MERN');
  }
  await sleep(5000);

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_final_patched_sent.png' });
  console.log('Final screenshot saved to screenshots/2026-10-12/wa_final_patched_sent.png');

  await browser.disconnect();
}

main().catch(console.error);
