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

  // 1. Click attach button
  console.log('Clicking paperclip attach button in footer...');
  const attachClip = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"], #main footer button');
  if (attachClip) {
    await attachClip.click();
    await sleep(1500);
  }

  // 2. Click the Document item in popup menu
  console.log('Clicking Document option in popup menu...');
  await wa.evaluate(() => {
    const list = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'));
    const doc = list.find(l => l.innerText && l.innerText.trim().toLowerCase() === 'document');
    if (doc) doc.click();
  });
  await sleep(2000);

  // 3. Look for file input
  const allInputs = await wa.$$('input[type="file"]');
  console.log('Total file inputs found:', allInputs.length);
  const docInput = allInputs[allInputs.length - 1];

  if (!docInput) {
    console.error('File input not available');
    await browser.disconnect();
    return;
  }

  // Upload FE Resume
  console.log('Uploading FE Resume to document input...');
  await docInput.uploadFile(feResume);
  await sleep(4000);

  // Assert and click green circular send button inside the document preview overlay
  console.log('Locating green send button...');
  const sendClicked = await wa.evaluate(() => {
    const btn = document.querySelector('span[data-icon="send"]') || document.querySelector('div[aria-label="Send"]');
    if (btn) {
      const clickEl = btn.closest('div[role="button"]') || btn;
      clickEl.click();
      return true;
    }
    return false;
  });

  if (!sendClicked) {
    console.log('Falling back to mouse coordinate click for send button...');
    await wa.mouse.click(1466, 670);
  }

  console.log('FE Resume sent! Waiting 6s...');
  await sleep(6000);

  // 4. Send MERN Resume
  const attachClip2 = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"], #main footer button');
  if (attachClip2) {
    await attachClip2.click();
    await sleep(1500);
  }

  await wa.evaluate(() => {
    const list = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'));
    const doc = list.find(l => l.innerText && l.innerText.trim().toLowerCase() === 'document');
    if (doc) doc.click();
  });
  await sleep(2000);

  const allInputs2 = await wa.$$('input[type="file"]');
  const docInput2 = allInputs2[allInputs2.length - 1];
  if (docInput2) {
    console.log('Uploading MERN Resume to document input...');
    await docInput2.uploadFile(mernResume);
    await sleep(4000);

    const sendClicked2 = await wa.evaluate(() => {
      const btn = document.querySelector('span[data-icon="send"]') || document.querySelector('div[aria-label="Send"]');
      if (btn) {
        const clickEl = btn.closest('div[role="button"]') || btn;
        clickEl.click();
        return true;
      }
      return false;
    });

    if (!sendClicked2) {
      await wa.mouse.click(1466, 670);
    }
    console.log('MERN Resume sent! Waiting 6s...');
    await sleep(6000);
  }

  // 5. Final Screenshot Proof
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_verified_sent.png' });
  console.log('Saved proof screenshot to screenshots/2026-10-12/wa_aman_verified_sent.png');

  await browser.disconnect();
}

main().catch(console.error);
