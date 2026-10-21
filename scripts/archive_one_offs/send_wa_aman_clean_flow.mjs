import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  console.log('1. Clearing modals...');
  // Click Discard if present
  await wa.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button, div[role="button"]'));
    const discard = btns.find(b => b.innerText && b.innerText.includes('Discard'));
    if (discard) discard.click();
  });
  await sleep(1500);

  // Assert chat is Aman Techstuff
  const header = await wa.evaluate(() => document.querySelector('#main header')?.innerText?.replace(/\n+/g, ' '));
  console.log('Active Header:', header);

  async function sendOneFile(filePath, label) {
    console.log(`\n=== Preparing to send: ${label} ===`);
    // Click Attach button
    await wa.evaluate(() => {
      const attachBtn = document.querySelector('[aria-label="Attach"], span[data-icon="plus"]')?.closest('button');
      if (attachBtn) attachBtn.click();
    });
    await sleep(1500);

    // Click Document
    const clickedDoc = await wa.evaluate(() => {
      const items = Array.from(document.querySelectorAll('li, div[role="menuitem"], div[role="button"], span'));
      const doc = items.find(el => el.innerText && el.innerText.trim().toLowerCase() === 'document');
      if (doc) {
        doc.click();
        return true;
      }
      return false;
    });
    console.log('Clicked Document option:', clickedDoc);
    await sleep(1500);

    // Upload to file input
    const inputs = await wa.$$('input[type="file"]');
    console.log(`Inputs available: ${inputs.length}`);
    const input = inputs[inputs.length - 1];
    await input.uploadFile(filePath);
    console.log('File uploaded to input.');
    await sleep(4000);

    // Click the green circle Send button
    // Selector in WhatsApp Web document preview: span[data-icon="send"] or [aria-label="Send"]
    const sent = await wa.evaluate(() => {
      // Find the button with send icon or aria-label="Send"
      const btn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, div[role="button"]')
               || Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => b.getAttribute('aria-label') === 'Send');
      if (btn) {
        btn.click();
        return true;
      }
      return false;
    });
    console.log('Send button clicked:', sent);
    if (!sent) {
      console.log('Pressing Enter key...');
      await wa.keyboard.press('Enter');
    }

    await sleep(5000);
  }

  // Send Frontend Resume
  await sendOneFile(feResume, 'Frontend Engineer Resume');

  // Send MERN Resume
  await sendOneFile(mernResume, 'MERN Full Stack Resume');

  // Capture final screenshot
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_aman_both_resumes_clean_proof.png' });
  console.log('Screenshot saved to screenshots/2026-10-12/wa_aman_both_resumes_clean_proof.png');

  // Verify chat bubbles
  const lastMsgs = await wa.evaluate(() => {
    return Array.from(document.querySelectorAll('#main [role="row"], #main [data-testid="msg-container"]')).slice(-6).map(el => el.innerText.replace(/\n+/g, ' '));
  });
  console.log('Final messages in chat:', lastMsgs);

  await browser.disconnect();
}

main().catch(console.error);
