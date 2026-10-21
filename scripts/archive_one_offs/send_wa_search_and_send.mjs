import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  // Search 'Aman Techstuff' in WA search bar
  console.log('Focusing WhatsApp search box...');
  // Selector for WhatsApp search bar
  const searchInput = await wa.$('div[contenteditable="true"][data-tab="3"], div[role="textbox"][title*="Search"]');
  if (searchInput) {
    await searchInput.click();
    await sleep(500);
    // Select all and type
    await wa.keyboard.down('Control');
    await wa.keyboard.press('A');
    await wa.keyboard.up('Control');
    await wa.keyboard.press('Backspace');
    await sleep(300);
    await wa.keyboard.type('Aman Techstuff', { delay: 40 });
    console.log('Typed Aman Techstuff. Waiting 2.5s for search results...');
    await sleep(2500);
    await wa.keyboard.press('Enter');
    await sleep(2500);
  }

  // Check if chat is now open in right side
  const chatInfo = await wa.evaluate(() => {
    // In newer WhatsApp Web, conversation pane can be identified by footer or header
    const footer = document.querySelector('footer');
    const header = document.querySelector('#main header, header');
    const hasInput = !!document.querySelector('footer div[contenteditable="true"]');
    return {
      hasFooterInput: hasInput,
      headerText: header ? header.innerText.replace(/\n+/g, ' | ') : null
    };
  });

  console.log('Chat Status post search:', chatInfo);

  if (!chatInfo.hasFooterInput) {
    console.log('Trying Enter key again...');
    await wa.keyboard.press('ArrowDown');
    await sleep(500);
    await wa.keyboard.press('Enter');
    await sleep(2500);
  }

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Trigger attach document menu
  console.log('Clicking attach button...');
  const attachBtn = await wa.$('footer span[data-icon="plus"], footer div[title="Attach"], footer button[aria-label="Attach"]');
  if (attachBtn) {
    await attachBtn.click();
    await sleep(1500);
  }

  let docInput = await wa.$('input[type="file"][accept*="*"]');
  if (!docInput) docInput = await wa.$('input[type="file"]');

  if (!docInput) {
    console.error('File input not found');
    await browser.disconnect();
    return;
  }

  console.log('Uploading Frontend Engineer Resume...');
  await docInput.uploadFile(feResume);
  await sleep(4000);

  let sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) await sendBtn.click();
  else await wa.keyboard.press('Enter');

  console.log('FE Resume sent! Waiting 5s...');
  await sleep(5000);

  // Attach MERN Resume
  const attachBtn2 = await wa.$('footer span[data-icon="plus"], footer div[title="Attach"], footer button[aria-label="Attach"]');
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

  console.log('MERN Resume sent! Waiting 5s...');
  await sleep(5000);

  console.log('Done!');
  await browser.disconnect();
}

main().catch(console.error);
