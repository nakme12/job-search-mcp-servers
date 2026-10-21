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

  // WhatsApp Web drag-and-drop file directly into chat window!
  console.log('Sending files via WhatsApp drop target...');
  
  // Create a file input dynamically if needed or trigger native drop
  const sent = await wa.evaluate(async (feBase64, mernBase64) => {
    function b64toBlob(b64Data, contentType) {
      const byteCharacters = atob(b64Data);
      const byteArrays = [];
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      return new Blob(byteArrays, { type: contentType });
    }

    const feBlob = b64toBlob(feBase64, 'application/pdf');
    const feFile = new File([feBlob], 'Pratik Patidar Resume - Frontend Engineer.pdf', { type: 'application/pdf' });

    const mernBlob = b64toBlob(mernBase64, 'application/pdf');
    const mernFile = new File([mernBlob], 'Pratik Patidar Resume - MERN Full Stack.pdf', { type: 'application/pdf' });

    const dt = new DataTransfer();
    dt.items.add(feFile);
    dt.items.add(mernFile);

    const dropZone = document.querySelector('#main') || document.body;
    const dropEvent = new DragEvent('drop', {
      bubbles: true,
      cancelable: true,
      dataTransfer: dt
    });
    dropZone.dispatchEvent(dropEvent);
    return true;
  }, fs.readFileSync(feResume).toString('base64'), fs.readFileSync(mernResume).toString('base64'));

  console.log('Drop event triggered:', sent);
  await sleep(4000);

  // Take screenshot of preview modal
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_drop_preview.png' });

  // Look for green circular send button
  const sendBtn = await wa.$('span[data-icon="send"], div[aria-label="Send"], button[aria-label="Send"]');
  if (sendBtn) {
    await sendBtn.click();
    console.log('Clicked Send button in preview!');
  } else {
    // Click coordinates of green send button in bottom-right
    console.log('Clicking send by coordinates...');
    await wa.mouse.click(1466, 670);
  }

  await sleep(5000);
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_drop_final.png' });
  console.log('Final screenshot saved to screenshots/2026-10-12/wa_drop_final.png');

  await browser.disconnect();
}

main().catch(console.error);
