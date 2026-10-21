import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) {
    console.error('WhatsApp tab not found');
    await browser.disconnect();
    return;
  }

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  console.log('1. Clicking Aman Techstuff at x=208, y=452...');
  await wa.mouse.click(208, 452);
  await sleep(2000);

  // Check header text
  const currentChat = await wa.evaluate(() => {
    return document.querySelector('#main header')?.innerText?.split('\n')[0] || '';
  });
  console.log('Active Chat Header:', currentChat);

  if (!currentChat.toLowerCase().includes('aman')) {
    console.log('Retrying click on Aman span directly via DOM click...');
    await wa.evaluate(() => {
      const all = Array.from(document.querySelectorAll('#pane-side span'));
      const aman = all.find(el => el.innerText && el.innerText.includes('Aman Techstuff'));
      if (aman) {
        aman.closest('[role="listitem"], [data-testid="cell-frame-container"], div')?.click();
      }
    });
    await sleep(2000);
  }

  const headerConfirmed = await wa.evaluate(() => {
    return document.querySelector('#main header')?.innerText?.split('\n')[0] || '';
  });
  console.log('Confirmed Active Chat Header:', headerConfirmed);

  // Function to attach a document
  async function attachDocument(filePath, label) {
    console.log(`Attaching ${label}...`);
    // Click plus/paperclip button
    await wa.evaluate(() => {
      const btn = document.querySelector('span[data-icon="plus"], span[data-icon="attach-menu-plus"]')?.closest('button');
      if (btn) btn.click();
    });
    await sleep(1500);

    // Look for Document input or Document menu item
    // In WA Web, clicking Document triggers file input
    const documentBtn = await wa.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li, div[role="button"], button'));
      const docItem = items.find(el => el.innerText && el.innerText.toLowerCase().includes('document'));
      if (docItem) {
        docItem.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Document menu item:', documentBtn);
    await sleep(1500);

    // Find input[type="file"] that accepts docs (* or .pdf or multiple)
    const inputs = await wa.$$('input[type="file"]');
    console.log(`Found ${inputs.length} file inputs.`);
    const docInput = inputs[inputs.length - 1]; // Document file input is always the latest mounted
    if (!docInput) {
      throw new Error('File input not found');
    }

    await docInput.uploadFile(filePath);
    console.log(`Uploaded file path to input: ${filePath}`);
    await sleep(4000);

    // Click Send button (green circle with arrow)
    const sent = await wa.evaluate(() => {
      const sendBtn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button') 
                   || document.querySelector('[aria-label="Send"]');
      if (sendBtn) {
        sendBtn.click();
        return true;
      }
      return false;
    });
    console.log(`Sent button clicked for ${label}:`, sent);
    await sleep(4000);
  }

  // Send FE Resume
  await attachDocument(feResume, 'Frontend Engineer Resume');

  // Send MERN Resume
  await attachDocument(mernResume, 'MERN Full Stack Resume');

  // Capture Screenshot proof
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_delivered_proof.png' });
  console.log('Screenshot saved to screenshots/2026-10-12/wa_aman_delivered_proof.png');

  await browser.disconnect();
}

main().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
