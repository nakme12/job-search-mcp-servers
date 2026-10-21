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

  // Find document input (it has accept="*" and usually excludes image/video)
  const docInput = await wa.evaluateHandle(() => {
    const inputs = document.querySelectorAll('input[type="file"]');
    for (const input of inputs) {
      if (input.accept === '*' || input.accept.includes('application') || input.accept.includes('.pdf') || !input.accept.includes('image')) {
        return input;
      }
    }
    return inputs[0];
  });

  console.log('Attaching FE resume to Document input...');
  await docInput.uploadFile(feResume);
  await sleep(4000);

  // Click send button
  const sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn) await sendBtn.click();
  else await wa.keyboard.press('Enter');
  await sleep(5000);

  // Send MERN
  const plusBtn2 = await wa.$('span[data-icon="plus"]');
  if (plusBtn2) {
    await plusBtn2.click();
    await sleep(1500);
  }

  const docInput2 = await wa.evaluateHandle(() => {
    const inputs = document.querySelectorAll('input[type="file"]');
    for (const input of inputs) {
      if (input.accept === '*' || input.accept.includes('application') || input.accept.includes('.pdf') || !input.accept.includes('image')) {
        return input;
      }
    }
    return inputs[0];
  });

  console.log('Attaching MERN resume to Document input...');
  await docInput2.uploadFile(mernResume);
  await sleep(4000);

  const sendBtn2 = await wa.$('span[data-icon="send"], div[aria-label="Send"]');
  if (sendBtn2) await sendBtn2.click();
  else await wa.keyboard.press('Enter');
  await sleep(5000);

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_documents_sent.png' });
  console.log('Screenshot proof saved!');

  await browser.disconnect();
}

main().catch(console.error);
