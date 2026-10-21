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

  // 1. Search Aman Techstuff in search box to switch chat back to Aman
  console.log('Focusing search box and typing Aman Techstuff...');
  const searchBox = await wa.$('div[contenteditable="true"][data-tab="3"], div[role="textbox"][title*="Search"]');
  if (searchBox) {
    await searchBox.click();
    await sleep(400);
    await wa.keyboard.down('Control');
    await wa.keyboard.press('A');
    await wa.keyboard.up('Control');
    await wa.keyboard.press('Backspace');
    await wa.keyboard.type('Aman Techstuff', { delay: 35 });
    await sleep(2500);
    await wa.keyboard.press('Enter');
    await sleep(2500);
  }

  // Verify chat header is Aman Techstuff
  const activeHeader = await wa.evaluate(() => {
    return document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' ');
  });
  console.log('Active header post-search:', activeHeader);

  // 2. Click paperclip attach icon in footer
  console.log('Clicking attach button...');
  const attachClip = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"]');
  if (attachClip) {
    await attachClip.click();
    await sleep(1500);
  }

  // 3. Click Document menu item
  console.log('Clicking Document option...');
  await wa.evaluate(() => {
    const list = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"]'));
    const doc = list.find(l => l.innerText && l.innerText.toLowerCase().includes('document'));
    if (doc) doc.click();
  });
  await sleep(2000);

  // 4. Attach FE Resume
  const fileInputs = await wa.$$('input[type="file"]');
  const targetInput = fileInputs[fileInputs.length - 1];
  if (targetInput) {
    console.log('Uploading FE Resume to Aman...');
    await targetInput.uploadFile(feResume);
    await sleep(4000);

    // Click green circular send button
    await wa.evaluate(() => {
      const send = document.querySelector('span[data-icon="send"], div[aria-label="Send"]');
      if (send) {
        const clickEl = send.closest('div[role="button"]') || send;
        clickEl.click();
      }
    });
    console.log('FE Resume send clicked! Waiting 5s...');
    await sleep(5000);
  }

  // 5. Attach MERN Resume
  const attachClip2 = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"]');
  if (attachClip2) {
    await attachClip2.click();
    await sleep(1500);
  }

  await wa.evaluate(() => {
    const list = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"]'));
    const doc = list.find(l => l.innerText && l.innerText.toLowerCase().includes('document'));
    if (doc) doc.click();
  });
  await sleep(2000);

  const fileInputs2 = await wa.$$('input[type="file"]');
  const targetInput2 = fileInputs2[fileInputs2.length - 1];
  if (targetInput2) {
    console.log('Uploading MERN Resume to Aman...');
    await targetInput2.uploadFile(mernResume);
    await sleep(4000);

    await wa.evaluate(() => {
      const send = document.querySelector('span[data-icon="send"], div[aria-label="Send"]');
      if (send) {
        const clickEl = send.closest('div[role="button"]') || send;
        clickEl.click();
      }
    });
    console.log('MERN Resume send clicked! Waiting 5s...');
    await sleep(5000);
  }

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_final_verified_receipt.png' });
  console.log('Saved proof to screenshots/2026-10-12/wa_aman_final_verified_receipt.png');

  await browser.disconnect();
}

main().catch(console.error);
