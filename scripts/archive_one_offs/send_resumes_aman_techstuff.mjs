import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.error('WhatsApp tab not found');
    await browser.disconnect();
    return;
  }

  // 1. Ensure Aman Techstuff chat is active
  console.log('Ensuring Aman Techstuff chat is active...');
  const chatOpened = await wa.evaluate(() => {
    const spans = Array.from(document.querySelectorAll('span[title]'));
    const target = spans.find(s => s.getAttribute('title') === 'Aman Techstuff');
    if (!target) return false;
    const clickable = target.closest('div[tabindex]') || target.parentElement;
    if (clickable) {
      clickable.click();
      return true;
    }
    target.click();
    return true;
  });

  await sleep(2000);

  // 2. Resumes to attach
  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  if (!fs.existsSync(feResume) || !fs.existsSync(mernResume)) {
    throw new Error('One or both resumes not found on disk');
  }

  console.log('Attaching FE Resume:', feResume);
  console.log('Attaching MERN Resume:', mernResume);

  // 3. Find file input in WhatsApp Web (document attachment)
  // Usually WhatsApp Web has an attach button or file input in DOM
  let fileInput = await wa.$('input[type="file"][accept*="*"]');
  if (!fileInput) {
    // Click the attach / plus button to reveal file input
    console.log('Clicking attach button in chat...');
    const attachBtn = await wa.$('div[title="Attach"], span[data-icon="plus"], div[aria-label="Attach"]');
    if (attachBtn) {
      await attachBtn.click();
      await sleep(1000);
    }
    fileInput = await wa.$('input[type="file"]');
  }

  if (!fileInput) {
    throw new Error('WhatsApp file input element could not be found');
  }

  // Upload FE Resume
  console.log('Uploading FE Resume first...');
  await fileInput.uploadFile(feResume);
  await sleep(3500);

  let sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) {
    await sendBtn.click();
  } else {
    await wa.keyboard.press('Enter');
  }
  console.log('FE Resume sent! Waiting 3 seconds before sending MERN Resume...');
  await sleep(3500);

  // Upload MERN Resume
  console.log('Uploading MERN Resume...');
  let fileInput2 = await wa.$('input[type="file"][accept*="*"]');
  if (!fileInput2) {
    const attachBtn = await wa.$('div[title="Attach"], span[data-icon="plus"], div[aria-label="Attach"]');
    if (attachBtn) {
      await attachBtn.click();
      await sleep(1000);
    }
    fileInput2 = await wa.$('input[type="file"]');
  }

  await fileInput2.uploadFile(mernResume);
  await sleep(3500);

  sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) {
    await sendBtn.click();
  } else {
    await wa.keyboard.press('Enter');
  }
  console.log('MERN Resume sent!');
  await sleep(4000);

  // Send a quick polite follow-up text note
  console.log('Sending message note...');
  const msgBox = await wa.$('div[role="textbox"][contenteditable="true"]');
  if (msgBox) {
    await msgBox.focus();
    await wa.keyboard.type('Shared both Frontend and MERN Stack resumes for review.', { delay: 20 });
    await sleep(500);
    await wa.keyboard.press('Enter');
  }
  await sleep(3000);

  // Check last message in DOM
  const lastMsgs = await wa.evaluate(() => {
    const msgs = Array.from(document.querySelectorAll('div.message-in, div.message-out, div[data-id]'));
    return msgs.slice(-5).map(m => m.innerText.replace(/\n+/g, ' '));
  });
  console.log('Recent messages post-send:', lastMsgs);

  await browser.disconnect();
}

main().catch(console.error);
