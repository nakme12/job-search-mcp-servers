import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const pages = await browser.pages();
  const wa = pages.find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.log('No WhatsApp tab');
    await browser.disconnect();
    return;
  }

  // 1. Click directly on Aman Techstuff inside #pane-side
  console.log('Clicking Aman Techstuff chat in #pane-side...');
  await wa.evaluate(() => {
    const pane = document.querySelector('#pane-side');
    if (!pane) return;
    const elements = pane.querySelectorAll('span[title="Aman Techstuff"]');
    if (elements.length > 0) {
      const clickTarget = elements[0].closest('div[role="listitem"]') || elements[0].closest('div[tabindex]') || elements[0];
      const rect = clickTarget.getBoundingClientRect();
      const clickEvent = new MouseEvent('mousedown', { bubbles: true, cancelable: true, clientX: rect.x + 10, clientY: rect.y + 10 });
      clickTarget.dispatchEvent(clickEvent);
      clickTarget.dispatchEvent(new MouseEvent('mouseup', { bubbles: true, cancelable: true, clientX: rect.x + 10, clientY: rect.y + 10 }));
      clickTarget.click();
    }
  });

  await sleep(3000);

  // Check if #main is now open
  const mainStatus = await wa.evaluate(() => {
    const main = document.querySelector('#main');
    return {
      hasMain: !!main,
      header: main?.querySelector('header')?.innerText?.replace(/\n+/g, ' | ')
    };
  });
  console.log('Main status after click:', mainStatus);

  if (!mainStatus.hasMain) {
    console.log('Trying mouse click by coordinates...');
    const coords = await wa.evaluate(() => {
      const el = document.querySelector('span[title="Aman Techstuff"]');
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    });
    if (coords) {
      await wa.mouse.click(coords.x, coords.y);
      await sleep(3000);
    }
  }

  // Assert #main is visible
  const mainHeaderAfter = await wa.evaluate(() => {
    return document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' | ');
  });
  console.log('Main header after coordinate click:', mainHeaderAfter);

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Find file input in #main
  // In WhatsApp Web, clicking the '+' / attach button inside footer creates file input
  console.log('Clicking attach button inside #main footer...');
  const attachButton = await wa.$('#main footer div[title="Attach"], #main footer span[data-icon="plus"], #main footer button[aria-label="Attach"]');
  if (attachButton) {
    await attachButton.click();
    await sleep(1500);
  }

  // Look for the Document input option specifically (accept="*")
  let docInput = await wa.$('input[type="file"][accept*="*"]');
  if (!docInput) {
    docInput = await wa.$('input[type="file"]');
  }

  if (!docInput) {
    console.error('File input not available');
    await browser.disconnect();
    return;
  }

  // Send FE Resume
  console.log('Uploading FE Resume:', feResume);
  await docInput.uploadFile(feResume);
  await sleep(4000);

  // Send button in overlay
  let sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) {
    await sendBtn.click();
  } else {
    await wa.keyboard.press('Enter');
  }
  console.log('FE Resume sent! Waiting 4s...');
  await sleep(4000);

  // Attach MERN Resume
  const attachButton2 = await wa.$('#main footer div[title="Attach"], #main footer span[data-icon="plus"], #main footer button[aria-label="Attach"]');
  if (attachButton2) {
    await attachButton2.click();
    await sleep(1500);
  }

  let docInput2 = await wa.$('input[type="file"][accept*="*"]');
  if (!docInput2) {
    docInput2 = await wa.$('input[type="file"]');
  }

  console.log('Uploading MERN Resume:', mernResume);
  await docInput2.uploadFile(mernResume);
  await sleep(4000);

  sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) {
    await sendBtn.click();
  } else {
    await wa.keyboard.press('Enter');
  }
  console.log('MERN Resume sent! Waiting 4s...');
  await sleep(4000);

  // Physical assertion of sent files in chat
  const chatText = await wa.evaluate(() => {
    return document.querySelector('#main')?.innerText || '';
  });

  const verifiedFE = chatText.includes('Frontend Engineer.pdf') || chatText.includes('Frontend Engineer');
  const verifiedMERN = chatText.includes('MERN Full Stack.pdf') || chatText.includes('MERN Full Stack');

  console.log(`Assertion in live chat: FE=${verifiedFE}, MERN=${verifiedMERN}`);
  await browser.disconnect();
}

main().catch(console.error);
