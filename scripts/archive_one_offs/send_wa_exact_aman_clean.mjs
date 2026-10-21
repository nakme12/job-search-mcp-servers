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

  // In the screenshot, Aman Techstuff is at y=630. Vijay Patidar is at y=840.
  // Let's click exactly on Aman Techstuff at x=180, y=630
  console.log('Clicking Aman Techstuff row at x=180, y=630...');
  await wa.mouse.click(180, 630);
  await sleep(2500);

  // Assert active header is Aman Techstuff
  const title = await wa.evaluate(() => {
    return document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' ');
  });
  console.log('Active header:', title);

  if (!title || !title.includes('Aman Techstuff')) {
    console.log('Not Aman Techstuff, clicking at y=620...');
    await wa.mouse.click(180, 620);
    await sleep(2000);
  }

  // Double check title
  const title2 = await wa.evaluate(() => {
    return document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' ');
  });
  console.log('Header after 2nd try:', title2);

  // Now click attach paperclip at x=366, y=948
  await wa.mouse.click(366, 948);
  await sleep(1500);

  // Click Document at x=360, y=538
  await wa.mouse.click(360, 538);
  await sleep(2000);

  // Upload FE Resume
  const inputs = await wa.$$('input[type="file"]');
  const targetInput = inputs[inputs.length - 1];
  if (targetInput) {
    console.log('Uploading FE Resume to Aman...');
    await targetInput.uploadFile(feResume);
    await sleep(4000);

    // Click green circular send button at x=1466, y=670
    console.log('Clicking send for FE Resume...');
    await wa.mouse.click(1466, 670);
    await sleep(5000);
  }

  // Upload MERN Resume
  await wa.mouse.click(366, 948);
  await sleep(1500);

  await wa.mouse.click(360, 538);
  await sleep(2000);

  const inputs2 = await wa.$$('input[type="file"]');
  const targetInput2 = inputs2[inputs2.length - 1];
  if (targetInput2) {
    console.log('Uploading MERN Resume to Aman...');
    await targetInput2.uploadFile(mernResume);
    await sleep(4000);

    console.log('Clicking send for MERN Resume...');
    await wa.mouse.click(1466, 670);
    await sleep(5000);
  }

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_final_proof_real.png' });
  console.log('Final proof screenshot saved!');

  await browser.disconnect();
}

main().catch(console.error);
