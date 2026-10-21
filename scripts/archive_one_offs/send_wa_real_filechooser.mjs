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

  // Coordinates of Document menu item are approx x=360, y=538
  console.log('Clicking Document menu item...');
  const docCoords = await wa.evaluate(() => {
    const items = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'));
    const doc = items.find(el => el.innerText && el.innerText.trim().toLowerCase() === 'document');
    if (doc) {
      const r = doc.getBoundingClientRect();
      return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
    }
    return { x: 360, y: 538 };
  });

  console.log('Document coords:', docCoords);
  // We can attach files directly to the input that triggers on document click!
  // WhatsApp creates/attaches an input specifically when document is clicked
  const [fileChooser] = await Promise.all([
    wa.waitForFileChooser({ timeout: 5000 }).catch(() => null),
    wa.mouse.click(docCoords.x, docCoords.y)
  ]);

  if (fileChooser) {
    console.log('File chooser intercepted for Document! Selecting both resumes...');
    await fileChooser.accept([feResume, mernResume]);
  } else {
    console.log('No file chooser event, looking for newly added input...');
    const inputs = await wa.$$('input[type="file"]');
    const lastInput = inputs[inputs.length - 1];
    if (lastInput) {
      await lastInput.uploadFile(feResume, mernResume);
    }
  }

  await sleep(4000);
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_document_preview_ready.png' });

  // Click green send button in bottom-right
  console.log('Clicking send button...');
  await wa.mouse.click(1466, 670);
  await sleep(5000);

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_final_delivered.png' });
  console.log('Saved final proof to screenshots/2026-10-12/wa_final_delivered.png');

  await browser.disconnect();
}

main().catch(console.error);
