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

  // In the left pane, Aman Techstuff avatar is exactly at x=73, y=633. The text is at x=135, y=625.
  console.log('Clicking Aman Techstuff avatar at x=73, y=633...');
  await wa.mouse.click(73, 633);
  await sleep(2500);

  // Take screenshot to verify Aman chat is open
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_check_header.png' });

  const title = await wa.evaluate(() => {
    return document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' ');
  });
  console.log('Header after avatar click:', title);

  if (title && title.includes('Aman Techstuff')) {
    console.log('Aman Techstuff chat confirmed open!');

    // Paperclip is at x=366, y=948
    await wa.mouse.click(366, 948);
    await sleep(1500);

    // Document is at x=360, y=538
    await wa.mouse.click(360, 538);
    await sleep(2000);

    const inputs = await wa.$$('input[type="file"]');
    const lastInput = inputs[inputs.length - 1];
    if (lastInput) {
      console.log('Uploading FE Resume to Aman...');
      await lastInput.uploadFile(feResume);
      await sleep(4000);

      // Click green circular send button
      await wa.mouse.click(1466, 670);
      console.log('FE Resume sent!');
      await sleep(5000);
    }

    // Send MERN Resume
    await wa.mouse.click(366, 948);
    await sleep(1500);

    await wa.mouse.click(360, 538);
    await sleep(2000);

    const inputs2 = await wa.$$('input[type="file"]');
    const lastInput2 = inputs2[inputs2.length - 1];
    if (lastInput2) {
      console.log('Uploading MERN Resume to Aman...');
      await lastInput2.uploadFile(mernResume);
      await sleep(4000);

      await wa.mouse.click(1466, 670);
      console.log('MERN Resume sent!');
      await sleep(5000);
    }

    await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_final_success_proof.png' });
    console.log('Final success proof saved!');
  } else {
    console.log('Could not open Aman Techstuff chat. Trying text click at x=140, y=625...');
    await wa.mouse.click(140, 625);
    await sleep(2500);
  }

  await browser.disconnect();
}

main().catch(console.error);
