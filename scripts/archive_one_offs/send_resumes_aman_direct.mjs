import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.log('No WA tab');
    await browser.disconnect();
    return;
  }

  // 1. Click specifically on the chat listItem for Aman Techstuff
  console.log('Locating and clicking Aman Techstuff chat in the left pane...');
  const clicked = await wa.evaluate(() => {
    // Search left pane listitems
    const listItems = document.querySelectorAll('div[role="listitem"]');
    for (const item of listItems) {
      if (item.innerText.includes('Aman Techstuff')) {
        item.click();
        return { success: true, text: item.innerText.replace(/\n+/g, ' ') };
      }
    }
    // Fallback: search all span[title]
    const spans = document.querySelectorAll('span[title="Aman Techstuff"]');
    if (spans.length > 0) {
      spans[0].click();
      return { success: true, text: 'Clicked span' };
    }
    return { success: false };
  });

  console.log('Click result:', clicked);
  await sleep(3000);

  // 2. Assert #main pane is loaded and header is Aman Techstuff
  const mainHeader = await wa.evaluate(() => {
    const main = document.querySelector('#main');
    if (!main) return null;
    const header = main.querySelector('header');
    return header ? header.innerText.replace(/\n+/g, ' | ') : 'No header';
  });

  console.log('Main pane header:', mainHeader);
  if (!mainHeader || !mainHeader.includes('Aman Techstuff')) {
    console.log('Chat not opened properly. Trying search bar...');
    const searchBar = await wa.$('div[contenteditable="true"][data-tab="3"]');
    if (searchBar) {
      await searchBar.focus();
      await wa.keyboard.type('Aman Techstuff');
      await sleep(2000);
      await wa.keyboard.press('Enter');
      await sleep(2000);
    }
  }

  // 3. Attach documents inside #main
  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  console.log('Attaching resumes to chat...');

  // Send FE resume
  const attachBtn = await wa.$('#main div[title="Attach"], #main span[data-icon="plus"], #main button[aria-label="Attach"]');
  if (attachBtn) {
    await attachBtn.click();
    await sleep(1500);
  }

  let docInput = await wa.$('input[type="file"][accept*="*"], input[type="file"]');
  if (!docInput) {
    console.error('File input not found after clicking attach');
    await browser.disconnect();
    return;
  }

  console.log('Uploading FE resume:', feResume);
  await docInput.uploadFile(feResume);
  await sleep(4000);

  // Click green send button in document preview modal
  console.log('Clicking send in preview modal...');
  let sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"], div[role="button"][data-icon="send"]');
  if (sendBtn) {
    await sendBtn.click();
  } else {
    await wa.keyboard.press('Enter');
  }
  console.log('FE resume sent! Waiting 5s...');
  await sleep(5000);

  // Send MERN resume
  const attachBtn2 = await wa.$('#main div[title="Attach"], #main span[data-icon="plus"], #main button[aria-label="Attach"]');
  if (attachBtn2) {
    await attachBtn2.click();
    await sleep(1500);
  }

  let docInput2 = await wa.$('input[type="file"][accept*="*"], input[type="file"]');
  console.log('Uploading MERN resume:', mernResume);
  await docInput2.uploadFile(mernResume);
  await sleep(4000);

  sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"], div[role="button"][data-icon="send"]');
  if (sendBtn) {
    await sendBtn.click();
  } else {
    await wa.keyboard.press('Enter');
  }
  console.log('MERN resume sent! Waiting 5s...');
  await sleep(5000);

  // Check messages inside #main
  const lastMsgs = await wa.evaluate(() => {
    const main = document.querySelector('#main');
    if (!main) return [];
    const msgs = main.querySelectorAll('div[role="row"]');
    return Array.from(msgs).slice(-4).map(m => m.innerText.replace(/\n+/g, ' | '));
  });

  console.log('Recent messages in #main:', lastMsgs);
  await browser.disconnect();
}

main().catch(console.error);
