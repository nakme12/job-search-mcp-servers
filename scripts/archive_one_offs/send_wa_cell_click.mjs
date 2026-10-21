import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  // 1. Get exact bounding box of the cell container for Aman Techstuff
  const box = await wa.evaluate(() => {
    const pane = document.querySelector('#pane-side');
    if (!pane) return null;
    const spans = Array.from(pane.querySelectorAll('span'));
    const target = spans.find(s => s.innerText === 'Aman Techstuff');
    if (!target) return null;
    const cell = target.closest('[data-testid="cell-frame-container"]') || target.closest('[tabindex="-1"]');
    if (!cell) return null;
    const r = cell.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  });

  console.log('Target coordinates:', box);
  if (!box) {
    console.error('Could not get box');
    await browser.disconnect();
    return;
  }

  // Click on the chat
  await wa.mouse.click(box.x, box.y);
  await sleep(3000);

  // Check if main is now open
  const mainHeader = await wa.evaluate(() => {
    const main = document.querySelector('#main');
    return main ? main.querySelector('header')?.innerText?.replace(/\n+/g, ' ') : null;
  });
  console.log('Opened chat header in #main:', mainHeader);

  if (!mainHeader) {
    console.error('Chat did not open in #main');
    await browser.disconnect();
    return;
  }

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Trigger attach document menu
  const attachBtn = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"], #main footer button[aria-label="Attach"]');
  if (attachBtn) {
    await attachBtn.click();
    await sleep(1500);
  }

  // Get file input
  let docInput = await wa.$('input[type="file"][accept*="*"]');
  if (!docInput) docInput = await wa.$('input[type="file"]');

  console.log('Uploading FE Resume to Aman Techstuff...');
  await docInput.uploadFile(feResume);
  await sleep(4000);

  // Click green send button in document overlay
  let sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) await sendBtn.click();
  else await wa.keyboard.press('Enter');

  console.log('FE Resume sent! Waiting 5s...');
  await sleep(5000);

  // Send MERN Resume
  const attachBtn2 = await wa.$('#main footer span[data-icon="plus"], #main footer div[title="Attach"], #main footer button[aria-label="Attach"]');
  if (attachBtn2) {
    await attachBtn2.click();
    await sleep(1500);
  }

  let docInput2 = await wa.$('input[type="file"][accept*="*"]');
  if (!docInput2) docInput2 = await wa.$('input[type="file"]');

  console.log('Uploading MERN Resume to Aman Techstuff...');
  await docInput2.uploadFile(mernResume);
  await sleep(4000);

  sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) await sendBtn.click();
  else await wa.keyboard.press('Enter');

  console.log('MERN Resume sent! Waiting 5s...');
  await sleep(5000);

  // Verify inside chat
  const chatText = await wa.evaluate(() => {
    return document.querySelector('#main')?.innerText || '';
  });
  console.log('Chat verified Frontend:', chatText.includes('Frontend Engineer'));
  console.log('Chat verified MERN:', chatText.includes('MERN Full Stack'));

  await browser.disconnect();
}

main().catch(console.error);
