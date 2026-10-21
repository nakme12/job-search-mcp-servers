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

  // Click plus button
  const plusBtn = await wa.$('span[data-icon="plus"]');
  if (plusBtn) {
    await plusBtn.click();
    await sleep(1500);
  }

  // Click the 'Document' listitem/button in the popup menu!
  console.log('Clicking Document option in popup menu...');
  await wa.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'));
    const docOption = items.find(el => el.innerText && el.innerText.trim().toLowerCase() === 'document');
    if (docOption) {
      docOption.click();
    }
  });

  await sleep(1500);

  // Now find document input
  const docInput = await wa.$('input[type="file"][accept*="*"]');
  if (!docInput) {
    console.log('No accept=* input, getting last input');
  }

  const targetInput = docInput || (await wa.$$('input[type="file"]')).pop();
  if (targetInput) {
    console.log('Uploading FE resume to Document input...');
    await targetInput.uploadFile(feResume);
    await sleep(4000);

    // Click green send button in bottom right of document preview
    const sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
    if (sendBtn) await sendBtn.click();
    else await wa.keyboard.press('Enter');
    console.log('FE send triggered!');
    await sleep(5000);
  }

  // Send MERN
  const plusBtn2 = await wa.$('span[data-icon="plus"]');
  if (plusBtn2) {
    await plusBtn2.click();
    await sleep(1500);
  }

  await wa.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'));
    const docOption = items.find(el => el.innerText && el.innerText.trim().toLowerCase() === 'document');
    if (docOption) docOption.click();
  });
  await sleep(1500);

  const targetInput2 = (await wa.$('input[type="file"][accept*="*"]')) || (await wa.$$('input[type="file"]')).pop();
  if (targetInput2) {
    console.log('Uploading MERN resume to Document input...');
    await targetInput2.uploadFile(mernResume);
    await sleep(4000);

    const sendBtn2 = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
    if (sendBtn2) await sendBtn2.click();
    else await wa.keyboard.press('Enter');
    console.log('MERN send triggered!');
    await sleep(5000);
  }

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_real_document_sent.png' });
  console.log('Saved proof to screenshots/2026-10-12/wa_real_document_sent.png');

  await browser.disconnect();
}

main().catch(console.error);
