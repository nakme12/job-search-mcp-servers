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

  // 1. Re-click Aman Techstuff chat in the left list specifically!
  console.log('Re-clicking Aman Techstuff chat in left list...');
  await wa.evaluate(() => {
    const pane = document.querySelector('#pane-side');
    if (!pane) return;
    const spans = Array.from(pane.querySelectorAll('span'));
    const target = spans.find(s => s.innerText === 'Aman Techstuff');
    if (target) {
      target.click();
    }
  });

  await sleep(2500);

  // Assert chat header is Aman Techstuff
  const headerName = await wa.evaluate(() => {
    return document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' ');
  });
  console.log('Active chat in #main:', headerName);

  // 2. Click paperclip attach icon
  const attachClip = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"], #main footer button');
  if (attachClip) {
    await attachClip.click();
    await sleep(1500);
  }

  // 3. Click Document option
  await wa.evaluate(() => {
    const list = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"]'));
    const doc = list.find(l => l.innerText && l.innerText.toLowerCase().includes('document'));
    if (doc) doc.click();
  });
  await sleep(1500);

  // 4. File input
  const inputs = await wa.$$('input[type="file"]');
  const lastInput = inputs[inputs.length - 1];
  if (lastInput) {
    console.log('Uploading FE Resume to Aman...');
    await lastInput.uploadFile(feResume);
    await sleep(3500);

    // Click green circular send button inside the preview
    await wa.evaluate(() => {
      const send = document.querySelector('span[data-icon="send"], div[aria-label="Send"], div[role="button"][data-icon="send"]');
      if (send) send.click();
    });
    await sleep(4000);
  }

  // Send MERN Resume
  const attachClip2 = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"], #main footer button');
  if (attachClip2) {
    await attachClip2.click();
    await sleep(1500);
  }

  await wa.evaluate(() => {
    const list = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"]'));
    const doc = list.find(l => l.innerText && l.innerText.toLowerCase().includes('document'));
    if (doc) doc.click();
  });
  await sleep(1500);

  const inputs2 = await wa.$$('input[type="file"]');
  const lastInput2 = inputs2[inputs2.length - 1];
  if (lastInput2) {
    console.log('Uploading MERN Resume to Aman...');
    await lastInput2.uploadFile(mernResume);
    await sleep(3500);

    await wa.evaluate(() => {
      const send = document.querySelector('span[data-icon="send"], div[aria-label="Send"], div[role="button"][data-icon="send"]');
      if (send) send.click();
    });
    await sleep(4000);
  }

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_final_proof.png' });
  console.log('Saved proof to screenshots/2026-10-12/wa_aman_final_proof.png');

  await browser.disconnect();
}

main().catch(console.error);
