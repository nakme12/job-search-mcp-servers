import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Let's locate Aman Techstuff in sidebar by finding its title text
  console.log('1. Finding Aman Techstuff row...');
  const rowInfo = await wa.evaluate(() => {
    const list = Array.from(document.querySelectorAll('#pane-side [role="listitem"], #pane-side [data-testid="cell-frame-container"]'));
    for (const item of list) {
      if (item.innerText && item.innerText.includes('Aman Techstuff')) {
        const r = item.getBoundingClientRect();
        return {
          found: true,
          x: Math.round(r.x + r.width/2),
          y: Math.round(r.y + r.height/2)
        };
      }
    }
    return { found: false };
  });

  console.log('Row info:', rowInfo);
  if (rowInfo.found) {
    console.log(`Clicking Aman at (${rowInfo.x}, ${rowInfo.y})...`);
    await wa.mouse.click(rowInfo.x, rowInfo.y);
    await sleep(2500);
  }

  // Verify header
  const header = await wa.evaluate(() => document.querySelector('#main header')?.innerText?.split('\n')[0]);
  console.log('Active Header is now:', header);

  if (!header || !header.toLowerCase().includes('aman')) {
    console.error('Failed to open Aman Techstuff chat!');
    await browser.disconnect();
    return;
  }

  // Now, what happens when we click the paperclip at x=560, y=693?
  console.log('2. Clicking paperclip at x=560, y=693...');
  await wa.mouse.click(560, 693);
  await sleep(1500);

  // Take screenshot
  await wa.screenshot({ path: 'screenshots/2026-10-12/paperclip_clicked_state.png' });

  // In WhatsApp Web, when paperclip is open, let's find the Document button in the DOM
  const docButton = await wa.evaluate(() => {
    // Find Document
    const all = Array.from(document.querySelectorAll('*'));
    const doc = all.find(el => el.children.length === 0 && el.innerText && el.innerText.trim() === 'Document');
    if (doc) {
      const r = doc.getBoundingClientRect();
      return { found: true, x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2) };
    }
    return { found: false };
  });

  console.log('DocButton:', docButton);

  if (docButton.found) {
    // There is an input inside or Document triggers native file picker!
    // But in Chrome/Puppeteer, clicking an element that opens the OS file picker blocks if not handled by waitForFileChooser!
    console.log(`Clicking Document at (${docButton.x}, ${docButton.y}) with file chooser listener...`);
    
    // Note: Puppeteer's waitForFileChooser only works if the click actually triggers a file input click event.
    // Let's check if the Document button has an <input type="file"> as child or sibling!
    const inputChild = await wa.evaluate(() => {
      const all = Array.from(document.querySelectorAll('*'));
      const doc = all.find(el => el.children.length === 0 && el.innerText && el.innerText.trim() === 'Document');
      const container = doc.closest('li, button, div[role="button"]');
      const inp = container?.querySelector('input[type="file"]') || document.querySelector('ul input[type="file"]');
      return {
        hasInput: !!inp,
        accept: inp ? inp.getAttribute('accept') : null
      };
    });
    console.log('Input child inside menu:', inputChild);

    const [fileChooser] = await Promise.all([
      wa.waitForFileChooser({ timeout: 5000 }).catch(e => {
        console.log('waitForFileChooser timed out:', e.message);
        return null;
      }),
      wa.mouse.click(docButton.x, docButton.y)
    ]);

    if (fileChooser) {
      console.log('Intercepted file chooser! Uploading FE Resume...');
      await fileChooser.accept([feResume]);
      await sleep(4000);

      // Send
      console.log('Clicking Send...');
      await wa.evaluate(() => {
        const btn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, [role="button"]')
                 || document.querySelector('[aria-label="Send"]');
        if (btn) btn.click();
      });
      await sleep(5000);
      console.log('FE Resume sent!');
    }
  }

  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_current_chat_proof.png' });
  await browser.disconnect();
}

main().catch(console.error);
