import puppeteer from 'puppeteer';
import path from 'path';

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const browser = await puppeteer.connect({ browserURL: 'http://127.0.0.1:9222', defaultViewport: null });
  const wa = (await browser.pages()).find(p => p.url().includes('web.whatsapp.com'));
  if (!wa) return;

  const feResume = path.resolve('resumes/Pratik Patidar Resume - Frontend Engineer.pdf');
  const mernResume = path.resolve('resumes/Pratik Patidar Resume - MERN Full Stack.pdf');

  // Let's click at x=366, y=948
  console.log('Clicking paperclip at x=366, y=948...');
  await wa.mouse.click(366, 948);
  await sleep(1500);

  // Take screenshot of popup
  await wa.screenshot({ path: 'screenshots/2026-10-12/wa_popup_active.png' });
  console.log('Popup screenshot captured');

  // Inspect what appeared
  const popupItems = await wa.evaluate(() => {
    return Array.from(document.querySelectorAll('*')).filter(el => {
      const text = el.innerText?.trim();
      return ['Document', 'Photos & videos', 'Camera', 'Contact', 'Poll'].includes(text);
    }).map(el => {
      const r = el.getBoundingClientRect();
      return { tag: el.tagName, text: el.innerText.trim(), x: Math.round(r.x + r.width/2), y: Math.round(r.y + r.height/2), w: r.width, h: r.height };
    });
  });

  console.log('Popup Items:', JSON.stringify(popupItems, null, 2));

  // If Document exists, let's look at its parent or associated input
  const doc = popupItems.find(p => p.text === 'Document');
  if (doc) {
    console.log(`Document item is at (${doc.x}, ${doc.y})`);
    
    // In WA Web, Document is an item that opens file picker or has a file input inside/near it!
    // Let's check inputs in DOM right now
    const inputsNow = await wa.evaluate(() => {
      return Array.from(document.querySelectorAll('input[type="file"]')).map((el, i) => ({
        i, accept: el.getAttribute('accept'), multiple: el.hasAttribute('multiple')
      }));
    });
    console.log('Inputs now:', JSON.stringify(inputsNow, null, 2));

    // Listen for fileChooser and click Document!
    console.log('Listening for fileChooser and clicking Document...');
    const [fileChooser] = await Promise.all([
      wa.waitForFileChooser({ timeout: 6000 }).catch(e => {
        console.log('No file chooser:', e.message);
        return null;
      }),
      wa.mouse.click(doc.x, doc.y)
    ]);

    if (fileChooser) {
      console.log('SUCCESS! Intercepted FileChooser. Uploading FE resume...');
      await fileChooser.accept([feResume]);
      await sleep(4000);
      await wa.screenshot({ path: 'screenshots/2026-10-12/wa_preview_after_filechooser.png' });

      // Click green Send button
      console.log('Clicking send...');
      const sent = await wa.evaluate(() => {
        const btn = document.querySelector('span[data-icon="send"], span[data-icon="wds-ic-send-filled"]')?.closest('button, div[role="button"]')
                 || Array.from(document.querySelectorAll('button, div[role="button"]')).find(b => b.getAttribute('aria-label') === 'Send');
        if (btn) {
          btn.click();
          return true;
        }
        return false;
      });
      console.log('Send clicked:', sent);
      if (!sent) await wa.keyboard.press('Enter');
      await sleep(5000);
    }
  }

  await browser.disconnect();
}

main().catch(console.error);
