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

  // Send FE Resume
  console.log('Attaching FE Resume...');
  await wa.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach(i => {
      i.removeAttribute('accept');
      i.setAttribute('accept', '*');
    });
  });

  const fileInput = await wa.$('input[type="file"]');
  await fileInput.uploadFile(feResume);
  await sleep(3500);

  // Click green send button in bottom-right corner using exact coordinates
  const sendCoord = await wa.evaluate(() => {
    // Green circular send button has class with background green or svg with send icon
    const btns = Array.from(document.querySelectorAll('span[data-icon="send"], div[aria-label="Send"]'));
    if (btns.length > 0) {
      const r = btns[0].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    // Fallback: bottom right corner coordinates (~1460, 930)
    return { x: window.innerWidth - 60, y: window.innerHeight - 60 };
  });

  console.log('Clicking FE send button at:', sendCoord);
  await wa.mouse.click(sendCoord.x, sendCoord.y);
  await sleep(4000);

  // Send MERN Resume
  console.log('Attaching MERN Resume...');
  await wa.evaluate(() => {
    const inputs = document.querySelectorAll('input[type="file"]');
    inputs.forEach(i => {
      i.removeAttribute('accept');
      i.setAttribute('accept', '*');
    });
  });

  const fileInput2 = await wa.$('input[type="file"]');
  await fileInput2.uploadFile(mernResume);
  await sleep(3500);

  const sendCoord2 = await wa.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('span[data-icon="send"], div[aria-label="Send"]'));
    if (btns.length > 0) {
      const r = btns[0].getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return { x: window.innerWidth - 60, y: window.innerHeight - 60 };
  });

  console.log('Clicking MERN send button at:', sendCoord2);
  await wa.mouse.click(sendCoord2.x, sendCoord2.y);
  await sleep(4000);

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_proof_sent_success.png' });
  console.log('Proof saved to screenshots/2026-10-12/wa_proof_sent_success.png');

  await browser.disconnect();
}

main().catch(console.error);
